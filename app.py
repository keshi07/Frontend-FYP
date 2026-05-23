from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from google.cloud import dialogflow_v2 as dialogflow
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
            "Speak to Live Agent"
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
    

if __name__ == "__main__":

    app.run(debug=True, port=5000, use_reloader=True)