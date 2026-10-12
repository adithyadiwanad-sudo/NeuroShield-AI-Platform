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
# Add independent authored cases once; rebuilding is idempotent.
additional = {
    'Safe': [
        'hi', 'hii', 'hiii', 'hello', 'hey', 'good morning', 'good evening', 'prabhat',
        'Good morning prabhat, how are you today?', 'Hello Adithya, how was your day?',
        'Please send the class notes tomorrow.', 'Urgent', 'please', 'Thank you',
        'See you soon', 'Lunch is ready', 'Meeting at ten', 'Happy birthday',
        'I will call you after class.', 'The project report is ready for review.',
        'Can we meet in the library?', 'Your appointment is confirmed for Monday.',
        'Never share your OTP or password with anyone.', 'The bank closes at five today.',
        'Please review the presentation when you have time.', 'I paid the electricity bill yesterday.',
        'Our teacher explained phishing awareness today.', 'Your order has been delivered.',
        'Are you coming to college tomorrow?', 'Good evening everyone, welcome to the meeting.',
        'The job interview is scheduled for Tuesday.', 'Check the official website for class schedules.',
    ],
    'Banking Scam': [
        'URGENT: Your bank account is locked. Click http://bit.ly/bank-renew to verify your OTP immediately or face penalty.',
        'Bank support: your account will be suspended. Enter your password at http://bank-verify.example now.',
        'Final notice from bank: transfer funds immediately to avoid account freeze.',
        'Your bank KYC expires today. Send your OTP to our support team immediately.',
        'Bank manager requests your PIN and account password to stop a penalty.',
    ],
    'OTP Fraud': [
        'Share your OTP immediately to prevent your account from being suspended.',
        'Support team needs you to send your OTP now. Do not tell anyone.',
        'Enter your OTP at http://otp-check.example immediately to restore access.',
        'Your bank payment is frozen. Provide your OTP to release the funds.',
        'Confirm your password and OTP now or face a penalty from the bank.',
    ],
    'Lottery Scam': [
        'Congratulations you won a lottery prize. Pay a registration fee immediately.',
        'Claim your lottery winnings by sending gift cards to our prize office now.',
        'Your prize expires within 2 hours. Transfer funds for the release fee.',
        'Congratulations! A lottery prize is reserved for you. Enter your bank details to claim.',
    ],
    'Fake Legal Notice Fraud': [
        'Final notice from court: pay the settlement immediately or face arrest.',
        'Police warning: transfer funds now to cancel the arrest warrant. Do not contact anyone.',
        'Tax department demands a settlement in gift cards to avoid legal action.',
        'Court support team requires your password and payment immediately to stop a penalty.',
    ],
    'Job Scam': [
        'Congratulations! You are selected for a part-time job earning Rs 5000/day. Telegram @job_admin now.',
        'Pay a registration fee immediately for your guaranteed part-time job.',
        'Recruitment fee is required today. Send gift cards to the hiring manager.',
        'Congratulations on your job offer. Send your bank details to Telegram @job_admin.',
        'Earn Rs 8000/day with no interview. Telegram our manager and pay a fee now.',
    ],
    'Investment Scam': [
        'Guaranteed returns on your investment. Transfer funds immediately to our crypto wallet.',
        'Act now for guaranteed returns. Wire your savings and keep this secret.',
        'Your investment prize is ready. Pay a fee to unlock the withdrawal.',
        'Our manager guarantees profits. Send your bank details and transfer funds now.',
    ],
    'Phishing': [
        'Your password expires immediately. Enter your credentials at http://login-update.example.',
        'Support team: verify your password at http://secure-access.example or your account will be suspended.',
        'Urgent security notice. Confirm your OTP using http://verify-account.example.',
        'Your email account is suspended. Provide your password to the support team now.',
    ],
}
seen = {text for text, _ in samples}
for category, texts in additional.items():
    for text in texts:
        if text not in seen:
            samples.append([text, category])
            seen.add(text)
examples.write_text(json.dumps(samples, indent=2, ensure_ascii=False), encoding='utf-8')
# No lowercase/punctuation duplicates: TF-IDF already normalizes those variants.
vectorizer=TfidfVectorizer(ngram_range=(1,2),max_features=6000,lowercase=True)
x=vectorizer.fit_transform([text for text,_ in samples])
model=LogisticRegression(C=3.0,max_iter=800,random_state=42)
model.fit(x,[category for _,category in samples])
joblib.dump(model,folder/'scam_model.pkl');joblib.dump(vectorizer,folder/'scam_tfidf.pkl')
manifest={'training':'manually authored project examples; no held-out benchmark',
          'originalExamples':len(samples),'trainingExamples':len(samples),'augmentation':'none',
          'ngramRange':[1,2], 'C':3.0, 'maxIter':800,
          'sklearnVersion':sklearn.__version__,'randomSeed':42,
          'examplesSha256':hashlib.sha256(examples.read_bytes()).hexdigest(),'classes':list(model.classes_)}
(folder/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
