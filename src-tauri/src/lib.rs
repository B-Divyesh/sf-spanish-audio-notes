use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    fs::File,
    path::{Path, PathBuf},
};
use symphonia::core::{
    audio::SampleBuffer, codecs::DecoderOptions, formats::FormatOptions, io::MediaSourceStream,
    meta::MetadataOptions, probe::Hint,
};
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Segment {
    id: String,
    start: f64,
    end: f64,
    text: String,
}

#[derive(Serialize)]
struct Transcript {
    segments: Vec<Segment>,
    duration: f64,
}

fn model_info(model: &str) -> Result<(&'static str, &'static str, &'static str), String> {
    match model {
        "tiny" => Ok((
            "ggml-tiny.bin",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
            "be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21",
        )),
        "base" => Ok((
            "ggml-base.bin",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
            "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe",
        )),
        "small" => Ok((
            "ggml-small.bin",
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
            "1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b",
        )),
        _ => Err("Modelo no reconocido.".into()),
    }
}

fn model_path(app: &AppHandle, model: &str) -> Result<PathBuf, String> {
    let (file, _, _) = model_info(model)?;
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("models")
        .join(file))
}

#[tauri::command]
fn model_ready(app: AppHandle, model: String) -> Result<bool, String> {
    Ok(model_path(&app, &model)?.is_file())
}

#[tauri::command]
async fn download_model(app: AppHandle, model: String) -> Result<(), String> {
    let path = model_path(&app, &model)?;
    if path.is_file() {
        return Ok(());
    }
    let (_, url, expected_hash) = model_info(&model)?;
    let parent = path.parent().ok_or("Ruta de modelo no válida")?;
    tokio::fs::create_dir_all(parent)
        .await
        .map_err(|e| e.to_string())?;
    let temp = path.with_extension("part");
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("No se pudo descargar el modelo: {e}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "El servidor del modelo respondió {}",
            response.status()
        ));
    }
    let mut output = tokio::fs::File::create(&temp)
        .await
        .map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        hasher.update(&chunk);
        output.write_all(&chunk).await.map_err(|e| e.to_string())?;
    }
    output.flush().await.map_err(|e| e.to_string())?;
    let actual_hash = format!("{:x}", hasher.finalize());
    if actual_hash != expected_hash {
        let _ = tokio::fs::remove_file(&temp).await;
        return Err("La verificación del modelo falló; se eliminó la descarga.".into());
    }
    tokio::fs::rename(&temp, &path)
        .await
        .map_err(|e| e.to_string())
}

fn decode_audio(path: &Path) -> Result<(Vec<f32>, u32), String> {
    let file = File::open(path).map_err(|e| format!("No se pudo abrir el audio: {e}"))?;
    let source = MediaSourceStream::new(Box::new(file), Default::default());
    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }
    let probed = symphonia::default::get_probe()
        .format(
            &hint,
            source,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .map_err(|e| format!("Formato de audio no compatible: {e}"))?;
    let mut format = probed.format;
    let track = format
        .default_track()
        .ok_or("El archivo no contiene una pista de audio")?;
    let track_id = track.id;
    let source_rate = track
        .codec_params
        .sample_rate
        .ok_or("El audio no declara su frecuencia de muestreo")?;
    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| e.to_string())?;
    let mut mono = Vec::new();
    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            Err(symphonia::core::errors::Error::IoError(e))
                if e.kind() == std::io::ErrorKind::UnexpectedEof =>
            {
                break
            }
            Err(e) => return Err(format!("No se pudo leer el audio: {e}")),
        };
        if packet.track_id() != track_id {
            continue;
        }
        let decoded = match decoder.decode(&packet) {
            Ok(d) => d,
            Err(symphonia::core::errors::Error::DecodeError(_)) => continue,
            Err(e) => return Err(format!("No se pudo decodificar el audio: {e}")),
        };
        let spec = *decoded.spec();
        let channels = spec.channels.count();
        let mut buffer = SampleBuffer::<f32>::new(decoded.capacity() as u64, spec);
        buffer.copy_interleaved_ref(decoded);
        for frame in buffer.samples().chunks(channels) {
            mono.push(frame.iter().sum::<f32>() / channels as f32);
        }
    }
    if mono.is_empty() {
        return Err("La pista de audio está vacía".into());
    }
    Ok((mono, source_rate))
}

fn resample_linear(input: &[f32], source_rate: u32) -> Vec<f32> {
    if source_rate == 16_000 {
        return input.to_vec();
    }
    let ratio = source_rate as f64 / 16_000.0;
    let output_len = (input.len() as f64 / ratio) as usize;
    (0..output_len)
        .map(|i| {
            let position = i as f64 * ratio;
            let lower = position.floor() as usize;
            let upper = (lower + 1).min(input.len() - 1);
            let fraction = (position - lower as f64) as f32;
            input[lower] * (1.0 - fraction) + input[upper] * fraction
        })
        .collect()
}

#[tauri::command]
async fn transcribe_audio(
    app: AppHandle,
    path: String,
    model: String,
    variant: String,
) -> Result<Transcript, String> {
    let model_file = model_path(&app, &model)?;
    if !model_file.is_file() {
        return Err("Primero descarga el modelo local.".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let (decoded, rate) = decode_audio(Path::new(&path))?;
        let samples = resample_linear(&decoded, rate);
        let duration = samples.len() as f64 / 16_000.0;
        let context = WhisperContext::new_with_params(
            model_file.to_str().ok_or("Ruta del modelo no válida")?,
            WhisperContextParameters::default(),
        )
        .map_err(|e| format!("No se pudo abrir el modelo: {e}"))?;
        let mut state = context.create_state().map_err(|e| e.to_string())?;
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some("es"));
        params.set_translate(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_initial_prompt(&format!(
            "Transcripción fiel de una clase o reunión en español. Variante: {variant}."
        ));
        state
            .full(params, &samples)
            .map_err(|e| format!("La transcripción falló: {e}"))?;
        let count = state.full_n_segments().map_err(|e| e.to_string())?;
        let mut segments = Vec::with_capacity(count as usize);
        for index in 0..count {
            let text = state
                .full_get_segment_text(index)
                .map_err(|e| e.to_string())?
                .trim()
                .to_string();
            if text.is_empty() {
                continue;
            }
            segments.push(Segment {
                id: format!("segment-{index}"),
                start: state
                    .full_get_segment_t0(index)
                    .map_err(|e| e.to_string())? as f64
                    / 100.0,
                end: state
                    .full_get_segment_t1(index)
                    .map_err(|e| e.to_string())? as f64
                    / 100.0,
                text,
            });
        }
        Ok(Transcript { segments, duration })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            model_ready,
            download_model,
            transcribe_audio
        ])
        .run(tauri::generate_context!())
        .expect("error while running Audio Margin");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn model_names_are_restricted() {
        assert!(model_info("base").is_ok());
        assert!(model_info("../../secret").is_err());
    }
    #[test]
    fn resampling_keeps_duration() {
        let input = vec![0.25; 48_000];
        assert_eq!(resample_linear(&input, 48_000).len(), 16_000);
    }
    #[test]
    fn bundled_demo_audio_decodes() {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../public/assets/audio-margin-sample.wav");
        let (samples, rate) = decode_audio(&path).expect("sample WAV should decode");
        assert_eq!(rate, 16_000);
        assert_eq!(samples.len(), 16_000 * 12);
    }
}
