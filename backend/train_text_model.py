"""Rebuild only the example-trained text artifacts, using the pinned backend environment."""
import ast
import hashlib
import json
from pathlib import Path
import joblib
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

folder=Path(__file__).parent/'models'
source=Path(__file__).parent.parent/'flaskservice'/'train_models.py'
examples=folder/'training_examples.json'
if not examples.exists():
    module=ast.parse(source.read_text(encoding='utf-8'))
    assignment=next(node for node in module.body if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=='scam_samples' for target in node.targets))
    samples=ast.literal_eval(assignment.value)
    examples.write_text(json.dumps(samples,indent=2,ensure_ascii=False),encoding='utf-8')
samples=json.loads(examples.read_text(encoding='utf-8'))
augmented=[]
for text,category in samples:
    augmented.extend([(text,category),(text.lower(),category)])
    if category=='Safe':augmented.extend([(text+'!',category),(text+'.',category)])
vectorizer=TfidfVectorizer(ngram_range=(1,3),max_features=6000,lowercase=True)
x=vectorizer.fit_transform([text for text,_ in augmented])
model=LogisticRegression(C=3.0,max_iter=800,random_state=42)
model.fit(x,[category for _,category in augmented])
joblib.dump(model,folder/'scam_model.pkl');joblib.dump(vectorizer,folder/'scam_tfidf.pkl')
manifest={'training':'manually authored project examples, augmented; no held-out benchmark','originalExamples':len(samples),'augmentedExamples':len(augmented),'sklearnVersion':sklearn.__version__,'randomSeed':42,'examplesSha256':hashlib.sha256(examples.read_bytes()).hexdigest(),'classes':list(model.classes_)}
(folder/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
