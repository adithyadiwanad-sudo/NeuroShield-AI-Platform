"""Transparent network rules and reproducible, small-corpus model evaluation."""
import json
import time
from functools import lru_cache
from pathlib import Path


def network_result(flow):
    features = []
    if flow['Flow_Packets_s'] >= 500:
        features.append({'name': 'High packet rate (>=500/s)', 'impact': 40})
    if flow['Total_Fwd_Packets'] > 10 * max(1, flow['Total_Bwd_Packets']):
        features.append({'name': 'Forward / reverse packet imbalance', 'impact': 30})
    if flow['SYN_Flag_Count'] > 0 and flow['ACK_Flag_Count'] == 0:
        features.append({'name': 'SYN without ACK', 'impact': 20})
    if flow['Flow_Bytes_s'] >= 100000:
        features.append({'name': 'Elevated byte rate (>=100000/s)', 'impact': 10})
    score = sum(f['impact'] for f in features)
    return dict(title='Possible flood pattern' if score >= 65 else 'Network flow review' if score else 'Baseline flow review',
                score=score, source=f"Submitted flow / port {flow['Destination_Port']}",
                signalType='Network flow', payload=json.dumps(flow), provenance='heuristic',
                explanation=('Matched: ' + ', '.join(f['name'] for f in features) + '. ' if features else 'No configured flow rules matched. ') +
                'This is a transparent rule index, not a trained CICIDS classifier or proof of an attack.',
                features=features, phrases=[], checks=[{'label': 'Method', 'value': 'Four transparent flow rules'},
                {'label': 'Capture', 'value': 'Caller-supplied telemetry; no packet capture'}],
                axes=[{'axis': f['name'], 'value': f['impact']} for f in features])


@lru_cache(maxsize=1)
def evaluate_examples():
    import sklearn
    from sklearn.pipeline import make_pipeline
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedKFold, cross_val_predict
    from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
    examples = json.loads((Path(__file__).parent/'models'/'training_examples.json').read_text(encoding='utf-8'))
    texts, labels = zip(*examples)
    pipeline = make_pipeline(TfidfVectorizer(ngram_range=(1, 2), max_features=6000),
                             LogisticRegression(C=3, max_iter=800, random_state=42))
    start = time.perf_counter()
    predictions = cross_val_predict(pipeline, texts, labels, cv=StratifiedKFold(2, shuffle=True, random_state=42))
    precision, recall, f1, _ = precision_recall_fscore_support(labels, predictions, average='macro', zero_division=0)
    classes = sorted(set(labels))
    return {'success': True, 'dataset': 'Original project-authored text examples', 'samples': len(texts),
            'folds': 2, 'seed': 42, 'classes': classes, 'sklearnVersion': sklearn.__version__,
            'metrics': {'accuracy': accuracy_score(labels, predictions), 'precision': precision, 'recall': recall, 'f1': f1},
            'confusionMatrix': confusion_matrix(labels, predictions, labels=classes).tolist(),
            'evaluationSeconds': round(time.perf_counter()-start, 3),
            'method': 'Stratified 2-fold out-of-fold predictions; TF-IDF fitted separately inside each fold; no augmented copies.',
            'limitation': 'Small authored examples with similar templates. These are educational cross-validation results, not UNSW-NB15, NSL-KDD or CICIDS2017 benchmarks, and not proof of real-world accuracy.'}
