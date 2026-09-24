# Automatic speech setup

The companion prepares Parakeet when it starts. A new host needs no speech model folder, Oh My Pi installation, model account, or separate download command. Settings and Voice show preparation, download progress, readiness, or an error with Retry speech setup.

The first download is about 670 MB. Voice Director stores the model in its own local data folder. It can copy matching files from the existing Oh My Pi cache on this machine; that cache is an optional source, not a runtime dependency. Each file must match the pinned size and SHA-256 digest before it becomes available to transcription. Downloads use temporary files and become available through an atomic rename. Completed files survive a failed download or restart; an incomplete file is downloaded again. Setup requests share one active operation.

Audio transcription starts only after every model file is verified. The existing run and microphone consent rules still apply. While preparation is incomplete, ambient audio keeps only the bounded recent queue; speech older than 15 seconds is discarded before transcription.

## Model source and attribution

The model is [NVIDIA Parakeet TDT 0.6B v3](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Voice Director uses Fangjun Kuang's [int8 ONNX conversion for sherpa-onnx](https://huggingface.co/csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8), with no further weight changes. The fixed download revision and file digests are in `apps/companion/src/providers/speech-model.ts`. Runtime configuration follows the [sherpa-onnx model documentation](https://k2-fsa.github.io/sherpa/onnx/pretrained_models/offline-transducer/nemo-transducer-models.html).

## UI direction

This extends the existing green Settings and Voice surfaces. Replace the editable folder field with a plain status, a native progress bar during setup, and an outlined retry button on failure. Keep the rest of the form usable and preserve drafts during health polling. Show the one-time download size and model attribution. Ready, preparing, downloading, and error states use text labels as well as color.

## Verification

The complete existing model was verified and copied into Voice Director's managed folder. The packaged speech worker then transcribed the upstream English sample from that copy. Live downloads of the pinned token file and joiner model exercised ordinary file and large-file delivery from Hugging Face.

Isolated checks covered fresh downloads, reuse with networking unavailable, copying verified files, an unusable optional cache, HTTP errors, corrupt or oversized content, cancellation, retry, and invalid filenames. The authenticated setup API reported failure and then verified readiness on retry. Concurrent setup calls shared one operation.

Impeccable's hardening and polish pass checked the real ready state, plus an isolated dashboard fixture for error and download states. Retry changed the fixture to download progress, and an edited timeout survived health polling. Desktop and phone captures showed the status and actions without overflow. The fixture used simulated progress; it did not download the full model. The existing design tokens and shadcn/Base UI controls were retained.
