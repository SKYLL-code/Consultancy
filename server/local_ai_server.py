from flask import Flask, request, jsonify
from transformers import AutoModelForCausalLM, AutoTokenizer
from dotenv import load_dotenv
import torch
import time
import os
import re

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'), override=True)
app = Flask(__name__)
DEFAULT_MODEL_NAME = os.environ.get('LOCAL_AI_MODEL', 'microsoft/DialoGPT-small')
MODEL_CACHE = {}
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'

print(f'Local AI runtime starting on device: {DEVICE}')
print(f'Default model: {DEFAULT_MODEL_NAME}')


def load_model(model_name):
    if model_name in MODEL_CACHE:
        return MODEL_CACHE[model_name]

    print(f'Loading local AI model: {model_name}')
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)
    model.to(DEVICE)
    model.eval()
    MODEL_CACHE[model_name] = (tokenizer, model)
    return tokenizer, model


def build_prompt(messages):
    system_prompt = None
    lines = []

    for message in messages:
        role = message.get('role', 'user')
        content = message.get('content', '')
        if not content:
            continue

        if role == 'system':
            system_prompt = content.strip()
        elif role == 'assistant':
            lines.append(f'Assistant: {content.strip()}')
        else:
            lines.append(f'User: {content.strip()}')

    if system_prompt:
        lines.insert(0, system_prompt)

    lines.append('Assistant:')
    return '\n'.join(lines)


def clean_generated(generated, prompt=''):
    text = generated.strip()
    text = re.sub(r'(?is)^.*?(Assistant:|$)', r'\1', text).strip()
    text = re.sub(r'(?is)^System:.*', '', text).strip()
    text = re.sub(r'(?is)^User:.*', '', text).strip()
    text = re.sub(r'(?i)^you are an assistant.*', '', text).strip()
    text = re.sub(r'\s+', ' ', text).strip()
    return text


@app.route('/', methods=['GET'])
def index():
    return 'Local AI server is running.'


@app.route('/v1/chat/completions', methods=['POST'])
def chat_completions():
    data = request.get_json(force=True)
    if not data:
        return jsonify({'error': 'Invalid JSON payload.'}), 400

    messages = data.get('messages')
    if messages is None:
        prompt_text = data.get('prompt', '')
        messages = [{'role': 'user', 'content': prompt_text}] if prompt_text else []

    model_name = data.get('model') or DEFAULT_MODEL_NAME
    temperature = float(data.get('temperature', 0.2))
    max_tokens = int(data.get('max_tokens', 120))

    tokenizer, model = load_model(model_name)
    prompt = build_prompt(messages)

    inputs = tokenizer(prompt, return_tensors='pt')
    if DEVICE == 'cuda':
        inputs = {k: v.to('cuda') for k, v in inputs.items()}

    pad_token_id = tokenizer.eos_token_id if tokenizer.pad_token_id is None else tokenizer.pad_token_id

    with torch.no_grad():
        output_tokens = model.generate(
            **inputs,
            max_new_tokens=max_tokens,
            temperature=temperature,
            pad_token_id=pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
            do_sample=True,
            top_p=0.95,
            top_k=50
        )

    prompt_len = inputs['input_ids'].shape[1]
    generated = tokenizer.decode(output_tokens[0][prompt_len:], skip_special_tokens=True)
    generated = clean_generated(generated, prompt)

    prompt_tokens = prompt_len
    completion_tokens = output_tokens.shape[1] - prompt_len
    total_tokens = prompt_tokens + completion_tokens

    response = {
        'id': f'localai-{int(time.time())}',
        'object': 'chat.completion',
        'created': int(time.time()),
        'model': model_name,
        'choices': [
            {
                'index': 0,
                'message': {
                    'role': 'assistant',
                    'content': generated.strip()
                },
                'finish_reason': 'stop'
            }
        ],
        'usage': {
            'prompt_tokens': prompt_tokens,
            'completion_tokens': completion_tokens,
            'total_tokens': total_tokens
        }
    }

    return jsonify(response)


if __name__ == '__main__':
    port = int(os.environ.get('LOCAL_AI_PORT', 8080))
    app.run(host='0.0.0.0', port=port)
