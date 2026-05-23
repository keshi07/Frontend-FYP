from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from google.cloud import dialogflow_v2 as dialogflow
from google.protobuf import field_mask_pb2
import os
import requests

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
CORS(app)  # okay for dev

supabase_url = ("https://vvydeegctohtefohggxq.supabase.co")
supabase_key = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2eWRlZWdjdG9odGVmb2hnZ3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTA3MjUsImV4cCI6MjA5NDI4NjcyNX0.xxjY6Rmy7dBOz1LVeHrq9D_Na2jX5VjxeoKFHzUXhCE")

PROJECT_ID = "universitychatbot-ejvs"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "universitychatbot-ejvs-9bb89b9138f6.json"

@app.route("/")
def home():
    
    return render_template("index.html")

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/admin-dashboard")
def admin_dashboard():
    return render_template("admin-dashboard.html")

@app.route("/cso-dashboard")
def cso_dashboard():
    return render_template("cso-dashboard.html")

@app.route("/support")
def support():
    return render_template("support.html")

@app.route("/faq-management")
def faq_management():
    return render_template("faq-management.html")

def detect_intent_text(text, session_id):
    session_client = dialogflow.SessionsClient()
    session = session_client.session_path(PROJECT_ID, session_id)

    text_input = dialogflow.TextInput(text=text, language_code="en")
    query_input = dialogflow.QueryInput(text=text_input)

    response = session_client.detect_intent(
        request={"session": session, "query_input": query_input}
    )

    return {
        "intent": response.query_result.intent.display_name,
        "reply": response.query_result.fulfillment_text
    }

def get_faq_answer(intent_name):
    url = f"{supabase_url}/rest/v1/faq"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    params = {
        "intent": f"eq.{intent_name}",
        "select": "answer",
        "limit": 1
    }

    resp = requests.get(url, headers=headers, params=params)
    resp.raise_for_status()
    rows = resp.json()

    if rows:
        return rows[0]["answer"]
    return None


def get_user_profile(user_id):
    url = f"{supabase_url}/rest/v1/profiles"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    params = {
        "id": f"eq.{user_id}",
        "select": "id,full_name,role,created_at",
        "limit": 1
    }

    resp = requests.get(url, headers=headers, params=params)
    resp.raise_for_status()
    rows = resp.json()

    if rows:
        return rows[0]
    return None

def get_quick_replies(intent_name):
    quick_reply_map = {
        "Default Welcome Intent": [
            "Student Card Replacement",
            "Tuition Fees",
            "Course Transfer",
            "Exam Information",
            "Operating Hours",

        ],
        "student_card_replacement": [
            "Lost/Stolen",
            "Damaged"
        ],
        "student_card_replacement.damaged": [
            "Operating Hours",
            "Location"
        ],
        "operating_hours": [
            "Library",
            "Student Services",
            "IT Helpdesk"
        ],
        "wifi_issue": [
            "Windows Laptop",
            "MacBook",
            "Mobile Device"
        ],
        "tuition_fee_payment": [
            "Credit Card",
            "PayNow",
            "GIRO"
        ],
        "tuition_fee_payment.installment_plan": [
            "Yes",
            "No"
        ],
        "course_transfer": [
            "Local Student",
            "International Student"
        ]
    }
    return quick_reply_map.get(intent_name, [])

def supabase_headers(extra_headers=None):
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    if extra_headers:
        headers.update(extra_headers)
    return headers


def create_dialogflow_intent(display_name, training_phrases):
    intents_client = dialogflow.IntentsClient()
    parent = dialogflow.AgentsClient.agent_path(PROJECT_ID)

    training_phrase_objs = []
    for phrase in training_phrases:
        part = dialogflow.Intent.TrainingPhrase.Part(text=phrase)
        training_phrase = dialogflow.Intent.TrainingPhrase(parts=[part])
        training_phrase_objs.append(training_phrase)

    intent = dialogflow.Intent(
        display_name=display_name,
        training_phrases=training_phrase_objs
    )

    response = intents_client.create_intent(parent=parent, intent=intent)
    return response

def insert_faq_answer(intent_name, answer):
    url = f"{supabase_url}/rest/v1/faq"
    payload = {
        "intent": intent_name,
        "answer": answer
    }

    response = requests.post(
        url,
        headers=supabase_headers({"Prefer": "return=representation"}),
        json=payload
    )

    print("Supabase insert status:", response.status_code)
    print("Supabase insert body:", response.text)

    response.raise_for_status()
    rows = response.json()
    return rows[0] if rows else payload

def update_dialogflow_intent(original_intent_name, new_intent_name, training_phrases):
    intents_client = dialogflow.IntentsClient()
    parent = dialogflow.AgentsClient.agent_path(PROJECT_ID)

    matched_intent = None
    intents = intents_client.list_intents(
        request={
            "parent": parent,
            "intent_view": dialogflow.IntentView.INTENT_VIEW_FULL
        }
    )

    for intent in intents:
        if intent.display_name == original_intent_name:
            matched_intent = intents_client.get_intent(
                request={
                    "name": intent.name,
                    "intent_view": dialogflow.IntentView.INTENT_VIEW_FULL
                }
            )
            break

    if not matched_intent:
        raise Exception(f'Dialogflow intent "{original_intent_name}" not found.')

    matched_intent.display_name = new_intent_name

    training_phrase_objs = []
    for phrase in training_phrases:
        part = dialogflow.Intent.TrainingPhrase.Part(text=phrase)
        training_phrase = dialogflow.Intent.TrainingPhrase(parts=[part])
        training_phrase_objs.append(training_phrase)

    matched_intent.training_phrases = training_phrase_objs

    update_mask = field_mask_pb2.FieldMask(
        paths=["display_name", "training_phrases"]
    )

    updated_intent = intents_client.update_intent(
        request={
            "intent": matched_intent,
            "update_mask": update_mask
        }
    )

    return updated_intent



@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_text = data.get("message", "").strip()
    session_id = data.get("sessionId", "").strip()

    if not user_text:
        return jsonify({"reply": "Please type a message."}), 400

    if not session_id:
        return jsonify({"reply": "Missing session ID."}), 400

    try:
        df_result = detect_intent_text(user_text, session_id)
        intent_name = df_result["intent"]

        db_answer = get_faq_answer(intent_name)
        reply_text = db_answer or df_result["reply"] or "Sorry, I couldn't find a matching answer."

        return jsonify({
            "reply": reply_text,
            "intent": intent_name,
            "sessionId": session_id,
            "quickReplies": get_quick_replies(intent_name)
        })

    except Exception as e:
        return jsonify({"reply": f"Server error: {str(e)}"}), 500
    
    
@app.route("/api/faqs/full", methods=["POST"])
def create_full_faq():
    data = request.get_json()

    intent = data.get("intent", "").strip()
    training_phrases = data.get("trainingPhrases", [])
    answer = data.get("answer", "").strip()

    if not intent or not answer:
        return jsonify({"error": "Intent name and answer are required."}), 400

    if not isinstance(training_phrases, list) or len(training_phrases) == 0:
        return jsonify({"error": "At least one training phrase is required."}), 400

    cleaned_phrases = [phrase.strip() for phrase in training_phrases if isinstance(phrase, str) and phrase.strip()]

    if len(cleaned_phrases) == 0:
        return jsonify({"error": "Training phrases cannot be empty."}), 400

    try:
        dialogflow_intent = create_dialogflow_intent(intent, cleaned_phrases)
        created_faq = insert_faq_answer(intent, answer)

        return jsonify({
            "message": "FAQ intent created successfully.",
            "faq": created_faq,
            "dialogflow_intent_name": dialogflow_intent.name
        }), 201

    except Exception as e:
        return jsonify({"error": f"Failed to create FAQ intent: {str(e)}"}), 500
    
    
@app.route("/api/faqs", methods=["GET"])
def get_faqs():
    try:
        url = f"{supabase_url}/rest/v1/faq"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}"
        }
        params = {
            "select": "id,intent,answer",
             "order": "id.asc"
        }

        response = requests.get(url, headers=headers, params=params)
        print("FAQ list status:", response.status_code)
        print("FAQ list body:", response.text)
        response.raise_for_status()

        faqs = response.json()

        return jsonify({"faqs": faqs}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to load FAQs: {str(e)}"}), 500
    
    
@app.route("/api/faqs/<faq_id>", methods=["GET"])
def get_faq_detail(faq_id):
    try:
        # 1. get FAQ row from Supabase
        url = f"{supabase_url}/rest/v1/faq"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}"
        }
        params = {
            "id": f"eq.{faq_id}",
            "select": "id,intent,answer",
            "limit": 1
        }

        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        rows = response.json()

        if not rows:
            return jsonify({"error": "FAQ not found."}), 404

        faq = rows[0]

        # 2. get Dialogflow intent with full view
        intents_client = dialogflow.IntentsClient()
        parent = dialogflow.AgentsClient.agent_path(PROJECT_ID)
        intents = intents_client.list_intents(
            request={
                "parent": parent,
                "intent_view": dialogflow.IntentView.INTENT_VIEW_FULL
            }
        )

        matched_intent = None
        for intent in intents:
            if intent.display_name == faq["intent"]:
                matched_intent = intent
                break

        training_phrases = []
        if matched_intent:
            training_phrases = [
                part.text
                for phrase in matched_intent.training_phrases
                for part in phrase.parts
                if part.text.strip()
            ]

        return jsonify({
            "faq": {
                "id": faq["id"],
                "intent": faq["intent"],
                "answer": faq["answer"],
                "trainingPhrases": training_phrases
            }
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to load FAQ details: {str(e)}"}), 500
    
    
@app.route("/api/faqs/<faq_id>", methods=["PUT"])
def update_faq(faq_id):
    data = request.get_json()

    intent = data.get("intent", "").strip()
    answer = data.get("answer", "").strip()
    training_phrases = [
        phrase.strip()
        for phrase in data.get("trainingPhrases", [])
        if isinstance(phrase, str) and phrase.strip()
    ]

    if not intent or not answer:
        return jsonify({"error": "Intent name and answer are required."}), 400

    if len(training_phrases) == 0:
        return jsonify({"error": "At least one training phrase is required."}), 400

    try:
        # get current faq first, so we know the original intent name
        url = f"{supabase_url}/rest/v1/faq"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        get_response = requests.get(
            url,
            headers=headers,
            params={
                "id": f"eq.{faq_id}",
                "select": "id,intent,answer",
                "limit": 1
            }
        )
        get_response.raise_for_status()
        rows = get_response.json()

        if not rows:
            return jsonify({"error": "FAQ not found."}), 404

        existing_faq = rows[0]
        original_intent_name = existing_faq["intent"]

        update_dialogflow_intent(
            original_intent_name=original_intent_name,
            new_intent_name=intent,
            training_phrases=training_phrases
        )

        patch_response = requests.patch(
            url,
            headers=headers,
            params={"id": f"eq.{faq_id}"},
            json={
                "intent": intent,
                "answer": answer
            }
        )

        print("Update FAQ status:", patch_response.status_code)
        print("Update FAQ body:", patch_response.text)

        patch_response.raise_for_status()
        updated_rows = patch_response.json()

        return jsonify({
            "message": "FAQ updated successfully.",
            "faq": updated_rows[0] if updated_rows else None
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to update FAQ: {str(e)}"}), 500
    
@app.route("/api/faqs/<faq_id>", methods=["DELETE"])
def delete_faq(faq_id):
    try:
        url = f"{supabase_url}/rest/v1/faq"
        headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        # 1. get existing faq row
        get_response = requests.get(
            url,
            headers=headers,
            params={
                "id": f"eq.{faq_id}",
                "select": "id,intent,answer",
                "limit": 1
            }
        )
        get_response.raise_for_status()
        rows = get_response.json()

        if not rows:
            return jsonify({"error": "FAQ not found."}), 404

        existing_faq = rows[0]
        intent_name = existing_faq["intent"]

        # 2. find and delete matching Dialogflow intent
        intents_client = dialogflow.IntentsClient()
        parent = dialogflow.AgentsClient.agent_path(PROJECT_ID)

        matched_intent = None
        intents = intents_client.list_intents(
            request={
                "parent": parent,
                "intent_view": dialogflow.IntentView.INTENT_VIEW_FULL
            }
        )

        for intent in intents:
            if intent.display_name == intent_name:
                matched_intent = intent
                break

        if not matched_intent:
            return jsonify({
                "error": f'Dialogflow intent "{intent_name}" not found.'
            }), 404

        intents_client.delete_intent(request={"name": matched_intent.name})

        # 3. delete Supabase row only after Dialogflow delete succeeds
        delete_response = requests.delete(
            url,
            headers=headers,
            params={"id": f"eq.{faq_id}"}
        )

        print("Delete FAQ status:", delete_response.status_code)
        print("Delete FAQ body:", delete_response.text)

        delete_response.raise_for_status()

        return jsonify({
            "message": f'FAQ "{intent_name}" deleted successfully.'
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to delete FAQ: {str(e)}"}), 500
    

if __name__ == "__main__":

    app.run(debug=True, port=5000, use_reloader=True)