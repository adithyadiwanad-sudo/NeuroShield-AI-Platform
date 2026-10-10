# Model provenance

`train_text_model.py` regenerates the text model and TF-IDF vectorizer using the
pinned backend scikit-learn version. `training_examples.json` preserves the 56
manually authored examples from `flaskservice/train_models.py`; augmentation gives
164 rows. `manifest.json` records versions, seed, labels, and the training-data hash.

The API performs real inference, but this small project-example classifier has no
held-out benchmark or probability calibration. It must not be presented as a
validated phishing detector. Rule contributions are not model SHAP/LIME values.

Only trusted operator-installed artifacts may be placed here: joblib/pickle loading
can execute code. No API accepts uploaded model binaries. Missing or incompatible
artifacts cause an explicit rule-scoring fallback reported by `/api/health`.

No trained audio classifier is supplied. Audio metadata scoring is a review
heuristic and returns `syntheticVoiceLikelihood: null`.
