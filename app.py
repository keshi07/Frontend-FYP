from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from google.cloud import dialogflow_v2 as dialogflow
from google.protobuf import field_mask_pb2
import os
import requests
from datetime import datetime, timezone

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
CORS(app)

supabase_url = "https://vvydeegctohtefohggxq.supabase.co"
supabase_key = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2eWRlZWdjdG9odGVmb2hnZ3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MTA3MjUsImV4cCI6MjA5NDI4NjcyNX0.xxjY6Rmy7dBOz1LVeHrq9D_Na2jX5VjxeoKFHzUXhCE")

PROJECT_ID = "universitychatbot-ejvs"
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "universitychatbot-ejvs-9bb89b9138f6.json"

LIVE_SUPPORT_TOPICS = [
    "Account or Login",
    "Wi-Fi or IT Issue",
    "Student Portal",
    "Student Card",
    "Fees or Payments",
    "Academic or Enrolment",
    "Other"
]


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


def supabase_headers(extra_headers=None):
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    if extra_headers:
        headers.update(extra_headers)
    return headers


def get_faq_content(intent_name):
    url = f"{supabase_url}/rest/v1/faq"
    params = {
        "intent": f"eq.{intent_name}",
        "select": "id,intent,display_name,answer,summary,details,steps,related_topics,links",
        "limit": 1
    }

    resp = requests.get(url, headers=supabase_headers(), params=params)
    resp.raise_for_status()
    rows = resp.json()

    if rows:
        return rows[0]
    return None


def get_user_profile(user_id):
    url = f"{supabase_url}/rest/v1/profiles"
    params = {
        "id": f"eq.{user_id}",
        "select": "id,full_name,role,created_at",
        "limit": 1
    }

    resp = requests.get(url, headers=supabase_headers(), params=params)
    resp.raise_for_status()
    rows = resp.json()

    if rows:
        return rows[0]
    return None


def get_live_support_queue_size():
    """Count tickets that are currently waiting or being handled."""

    url = f"{supabase_url}/rest/v1/support_tickets"

    response = requests.get(
        url,
        headers=supabase_headers({"Prefer": "count=exact"}),
        params={
            "status": "in.(Open,In Progress)",
            "select": "id"
        }
    )

    response.raise_for_status()

    content_range = response.headers.get("Content-Range", "")

    if "/" in content_range:
        total = content_range.rsplit("/", 1)[-1]

        if total.isdigit():
            return int(total)

    return len(response.json())


def estimate_live_support_wait(queue_position):
    """
    Estimate the waiting time based on approximately
    three minutes per ticket.
    """

    minimum = max(1, (queue_position - 1) * 3)
    maximum = max(3, queue_position * 3)

    return minimum, maximum

def create_support_ticket(session_id, user_message, case_topic):
    import uuid

    queue_position = get_live_support_queue_size() + 1

    estimated_wait_min, estimated_wait_max = (
        estimate_live_support_wait(queue_position)
    )

    ticket_id = f"TKT-{str(uuid.uuid4())[:8]}"

    url = f"{supabase_url}/rest/v1/support_tickets"

    payload = {
        "ticket_id": ticket_id,
        "session_id": session_id,
        "user_message": user_message,
        "case_topic": case_topic,
        "status": "Open"
    }

    response = requests.post(
        url,
        headers=supabase_headers({
            "Prefer": "return=representation"
        }),
        json=payload
    )

    response.raise_for_status()

    return {
        "ticket_id": ticket_id,
        "queue_position": queue_position,
        "estimated_wait_min": estimated_wait_min,
        "estimated_wait_max": estimated_wait_max
    }

def get_quick_replies(intent_name):
    quick_reply_map = {

        "student_card_replacement": [
            "Lost/Stolen",
            "Damaged"
        ],
        "operating_hours": [
            "Library",
            "Student Services",
            "IT Helpdesk"
        ]
        
    }
    return quick_reply_map.get(intent_name, [])


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


def insert_faq_answer(
    intent_name,
    answer,
    display_name=None,
    summary=None,
    details=None,
    steps=None,
    related_topics=None,
    links=None,
):
    url = f"{supabase_url}/rest/v1/faq"
    payload = {
        "intent": intent_name,
        "display_name": display_name,
        "answer": answer,
        "summary": summary,
        "details": details,
        "steps": steps or [],
        "related_topics": related_topics or [],
        "links": links or [],
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

def get_related_topic_objects(intent_names):
    if not intent_names:
        return []

    cleaned = [name.strip() for name in intent_names if isinstance(name, str) and name.strip()]
    if not cleaned:
        return []

    url = f"{supabase_url}/rest/v1/faq"
    quoted = ",".join([f'"{name}"' for name in cleaned])
    params = {
        "select": "intent,display_name",
        "intent": f"in.({quoted})"
    }

    resp = requests.get(url, headers=supabase_headers(), params=params)
    resp.raise_for_status()
    rows = resp.json()

    label_map = {
        row["intent"]: (row.get("display_name") or row["intent"])
        for row in rows
    }

    return [
        {
            "intent": name,
            "label": label_map.get(name, name)
        }
        for name in cleaned
    ]


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    user_text = data.get("message", "").strip()
    session_id = data.get("sessionId", "").strip()
    is_intent_selection = data.get("isIntentSelection", False)
    is_live_support_topic = data.get("isLiveSupportTopic", False)

    if not user_text:
        return jsonify({"reply": "Please type a message."}), 400

    if not session_id:
        return jsonify({"reply": "Missing session ID."}), 400

    escalation_phrases = [
        "talk to live agent",
        "talk to human",
        "speak to human",
        "customer service",
        "live support",
        "contact support",
        "agent",
        "human"
    ]

    try:
        # Stage 1: Ask the user to choose a support topic.
        if user_text.lower() in escalation_phrases:
            return jsonify({
                "reply": "Please select the topic that best describes your issue.",
                "summary": "What do you need help with?",
                "details": (
                    "Select one of the topics below so the Customer Service "
                    "Officer can understand your case more quickly."
                ),
                "steps": [],
                "relatedTopics": [],
                "links": [],
                "quickReplies": LIVE_SUPPORT_TOPICS,
                "intent": "LiveAgentTopicSelection",
                "displayName": "Select Support Topic",
                "sessionId": session_id
            }), 200

        # Stage 2: Create the ticket only after the user selects a topic.
        if is_live_support_topic:
            selected_topic = user_text

            if selected_topic not in LIVE_SUPPORT_TOPICS:
                return jsonify({
                    "reply": "Please select a valid support topic.",
                    "summary": "Invalid support topic",
                    "details": "Choose one of the available support-topic buttons.",
                    "steps": [],
                    "relatedTopics": [],
                    "links": [],
                    "quickReplies": LIVE_SUPPORT_TOPICS,
                    "intent": "LiveAgentTopicSelection",
                    "displayName": "Select Support Topic",
                    "sessionId": session_id
                }), 400

            ticket = create_support_ticket(
                session_id=session_id,
                user_message=selected_topic,
                case_topic=selected_topic
            )

            ticket_id = ticket["ticket_id"]
            wait_min = ticket["estimated_wait_min"]
            wait_max = ticket["estimated_wait_max"]

            return jsonify({
                "reply": (
                    f"Your support ticket {ticket_id} has been created. "
                    f"Your estimated wait time is {wait_min} – {wait_max} minutes."
                ),
                "summary": (
                    f"Ticket number: {ticket_id}\n\n"
                    f"You are now in the live-support queue.\n"
                    f"Estimated wait: {wait_min}–{wait_max} minutes."
                ),
                "details": (
                    f"Selected topic: {selected_topic}. "
                    "Please keep this chat window open. "
                    "You will receive a notification when the live chat "
                    "connection has been established."
                ),
                "steps": [],
                "relatedTopics": [],
                "links": [],
                "quickReplies": [],
                "intent": "LiveAgentEscalation",
                "displayName": "Live Agent Escalation",
                "sessionId": session_id,
                "ticketId": ticket_id,
                "caseTopic": selected_topic,
                "queuePosition": ticket["queue_position"],
                "estimatedWaitMinutes": {
                    "minimum": wait_min,
                    "maximum": wait_max
                }
            }), 201

        if is_intent_selection:
            intent_name = user_text
            faq = get_faq_content(intent_name)
            df_result = {
                "intent": intent_name,
                "reply": faq.get("answer") if faq else ""
            }
        else:
            df_result = detect_intent_text(user_text, session_id)
            intent_name = df_result["intent"]
            faq = get_faq_content(intent_name)

        if faq:
            summary = (
                faq.get("summary")
                or faq.get("answer")
                or df_result["reply"]
                or "Sorry, I couldn't find a matching answer."
            )
            details = faq.get("details") or ""
            steps = faq.get("steps") or []
            related_topics = faq.get("related_topics") or []
            related_topic_objects = get_related_topic_objects(related_topics)
            links = faq.get("links") or []
            quick_replies = get_quick_replies(intent_name)

            return jsonify({
                "reply": faq.get("answer") or summary,
                "summary": summary,
                "details": details,
                "steps": steps,
                "relatedTopics": related_topic_objects,
                "links": links,
                "quickReplies": quick_replies,
                "intent": intent_name,
                "displayName": faq.get("display_name") or intent_name,
                "sessionId": session_id
            })

        fallback_reply = (
            df_result["reply"]
            or "Sorry, I couldn't find a matching answer."
        )

        fallback_quick_replies = get_quick_replies(intent_name) or [
            "Password Reset",
            "Wi-Fi Problem",
            "Student Portal Help",
            "Talk to Live Agent",
            "Others"
        ]

        return jsonify({
            "reply": fallback_reply,
            "summary": fallback_reply,
            "details": "",
            "steps": [],
            "relatedTopics": [],
            "links": [],
            "quickReplies": fallback_quick_replies,
            "intent": intent_name,
            "displayName": intent_name,
            "sessionId": session_id
        })

    except Exception as e:
        print("Chat error:", str(e))
        return jsonify({
            "reply": (
                "Sorry, the chatbot is temporarily unavailable. "
                "Please try again later."
            )
        }), 500


@app.route("/api/faqs/full", methods=["POST"])
def create_full_faq():
    data = request.get_json()

    intent = data.get("intent", "").strip()
    training_phrases = data.get("trainingPhrases", [])
    answer = data.get("answer", "").strip()
    display_name = data.get("displayName", "").strip()
    summary = data.get("summary", "").strip()
    details = data.get("details", "").strip()
    steps = data.get("steps", [])
    related_topics = data.get("relatedTopics", [])
    links = data.get("links", [])

    if not intent or not answer:
        return jsonify({"error": "Intent name and answer are required."}), 400

    if not isinstance(training_phrases, list) or len(training_phrases) == 0:
        return jsonify({"error": "At least one training phrase is required."}), 400

    cleaned_phrases = [
        phrase.strip()
        for phrase in training_phrases
        if isinstance(phrase, str) and phrase.strip()
    ]

    if len(cleaned_phrases) == 0:
        return jsonify({"error": "Training phrases cannot be empty."}), 400

    try:
        dialogflow_intent = create_dialogflow_intent(intent, cleaned_phrases)

        created_faq = insert_faq_answer(
            intent_name=intent,
            answer=answer,
             display_name=display_name or None,
            summary=summary or answer,
            details=details,
            steps=steps,
            related_topics=related_topics,
            links=links,
        )

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
        params = {
            "select": "id,intent,display_name,answer,summary,details,steps,related_topics,links",
            "order": "id.asc"
        }

        response = requests.get(url, headers=supabase_headers(), params=params)
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
        url = f"{supabase_url}/rest/v1/faq"
        params = {
            "id": f"eq.{faq_id}",
            "select": "id,intent,display_name,answer,summary,details,steps,related_topics,links",
            "limit": 1
        }

        response = requests.get(url, headers=supabase_headers(), params=params)
        response.raise_for_status()
        rows = response.json()

        if not rows:
            return jsonify({"error": "FAQ not found."}), 404

        faq = rows[0]

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
                "answer": faq.get("answer"),
                "display_name": faq.get("display_name"),
                "summary": faq.get("summary"),
                "details": faq.get("details"),
                "steps": faq.get("steps") or [],
                "related_topics": faq.get("related_topics") or [],
                "links": faq.get("links") or [],
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
    display_name = data.get("displayName", "").strip()
    summary = data.get("summary", "").strip()
    details = data.get("details", "").strip()
    steps = data.get("steps", [])
    related_topics = data.get("relatedTopics", [])
    links = data.get("links", [])
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
        url = f"{supabase_url}/rest/v1/faq"

        get_response = requests.get(
            url,
            headers=supabase_headers({"Prefer": "return=representation"}),
            params={
                "id": f"eq.{faq_id}",
                "select": "id,intent,display_name,answer,summary,details,steps,related_topics,links",
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
            headers=supabase_headers({"Prefer": "return=representation"}),
            params={"id": f"eq.{faq_id}"},
            json={
                "intent": intent,
                "answer": answer,
                "display_name": display_name or None,
                "summary": summary or answer,
                "details": details,
                "steps": steps,
                "related_topics": related_topics,
                "links": links
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

        get_response = requests.get(
            url,
            headers=supabase_headers({"Prefer": "return=representation"}),
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

        delete_response = requests.delete(
            url,
            headers=supabase_headers({"Prefer": "return=representation"}),
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


@app.route("/api/tickets", methods=["GET"])
def get_tickets():

    url = f"{supabase_url}/rest/v1/support_tickets"

    response = requests.get(
        url,
        headers=supabase_headers(),
        params={
            "select": "*",
            "order": "created_at.desc"
        }
    )

    response.raise_for_status()

    return jsonify(response.json())

@app.route("/api/chat/<ticket_id>", methods=["GET"])
def get_chat_messages(ticket_id):
    url = f"{supabase_url}/rest/v1/chat_messages"

    response = requests.get(
        url,
        headers=supabase_headers(),
        params={
            "ticket_id": f"eq.{ticket_id}",
            "select": "*",
            "order": "created_at.asc"
        }
    )

    response.raise_for_status()

    messages = response.json()

    for message in messages:
        created_at = message.get("created_at")

        if created_at and not created_at.endswith("Z"):
            if "+" not in created_at[-6:] and "-" not in created_at[-6:]:
                message["created_at"] = created_at + "+00:00"

    return jsonify(messages)


@app.route("/api/chat/send", methods=["POST"])
def send_chat_message():
    data = request.get_json()

    ticket_id = data.get("ticketId")
    sender = data.get("sender")
    message = data.get("message")

    if not ticket_id or not sender or not message:
        return jsonify({
            "error": "ticketId, sender and message are required"
        }), 400

    url = f"{supabase_url}/rest/v1/chat_messages"

    response = requests.post(
        url,
        headers={
            **supabase_headers(),
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        json={
            "ticket_id": ticket_id,
            "sender": sender,
            "message": message
        }
    )

    if not response.ok:
        print("Supabase error:", response.status_code, response.text)

        return jsonify({
            "error": response.text
        }), response.status_code

    return jsonify(response.json()), 201


@app.route("/api/tickets/<ticket_id>/connect", methods=["POST"])
def connect_to_ticket(ticket_id):
    """Mark an open ticket as in progress and notify the student."""

    tickets_url = f"{supabase_url}/rest/v1/support_tickets"

    ticket_response = requests.get(
        tickets_url,
        headers=supabase_headers(),
        params={
            "ticket_id": f"eq.{ticket_id}",
            "select": "ticket_id,status",
            "limit": 1
        }
    )

    ticket_response.raise_for_status()
    rows = ticket_response.json()

    if not rows:
        return jsonify({"error": "Ticket not found."}), 404

    current_status = rows[0].get("status")

    if current_status == "Resolved":
        return jsonify({
            "status": "Resolved",
            "connected": False
        }), 200

    if current_status == "Open":
        update_response = requests.patch(
            tickets_url,
            headers=supabase_headers({
                "Prefer": "return=representation"
            }),
            params={
                "ticket_id": f"eq.{ticket_id}"
            },
            json={
                "status": "In Progress"
            }
        )

        update_response.raise_for_status()

    messages_url = f"{supabase_url}/rest/v1/chat_messages"
    connected_message = (
        "The live chat connection has been established."
    )

    existing_response = requests.get(
        messages_url,
        headers=supabase_headers(),
        params={
            "ticket_id": f"eq.{ticket_id}",
            "sender": "eq.system",
            "message": f"eq.{connected_message}",
            "select": "id",
            "limit": 1
        }
    )

    existing_response.raise_for_status()

    if not existing_response.json():
        message_response = requests.post(
            messages_url,
            headers=supabase_headers({
                "Prefer": "return=representation"
            }),
            json={
                "ticket_id": ticket_id,
                "sender": "system",
                "message": connected_message
            }
        )

        message_response.raise_for_status()

    return jsonify({
        "status": "In Progress",
        "connected": True
    }), 200

@app.route("/api/tickets/<ticket_id>/reply", methods=["PUT"])
def reply_ticket(ticket_id):

    data = request.get_json()
    response_text = data.get("response", "")

    url = f"{supabase_url}/rest/v1/support_tickets"

    response = requests.patch(
        url,
        headers=supabase_headers({"Prefer": "return=representation"}),
        params={
            "ticket_id": f"eq.{ticket_id}"
        },
        json={
            "status": "Resolved",
            "cso_response": response_text
        }
    )

    response.raise_for_status()

    return jsonify({
        "message": "Ticket updated successfully"
    })

@app.route(
    "/api/tickets/<ticket_id>/resolve-with-message",
    methods=["POST"]
)
def resolve_ticket_with_message(ticket_id):
    """Send a final CSO message and resolve the ticket in one action."""

    data = request.get_json(silent=True) or {}
    resolution_message = str(data.get("message", "")).strip()

    if not resolution_message:
        return jsonify({
            "error": "A final resolution message is required."
        }), 400

    tickets_url = f"{supabase_url}/rest/v1/support_tickets"
    messages_url = f"{supabase_url}/rest/v1/chat_messages"

    try:
        ticket_response = requests.get(
            tickets_url,
            headers=supabase_headers(),
            params={
                "ticket_id": f"eq.{ticket_id}",
                "select": "ticket_id,status",
                "limit": 1
            }
        )

        ticket_response.raise_for_status()
        ticket_rows = ticket_response.json()

        if not ticket_rows:
            return jsonify({
                "error": "Ticket not found."
            }), 404

        if ticket_rows[0].get("status") == "Resolved":
            return jsonify({
                "error": "This ticket has already been resolved."
            }), 409

        message_response = requests.post(
            messages_url,
            headers=supabase_headers({
                "Prefer": "return=representation"
            }),
            json={
                "ticket_id": ticket_id,
                "sender": "cso",
                "message": resolution_message
            }
        )

        message_response.raise_for_status()
        inserted_messages = message_response.json()

        resolved_at = datetime.now(timezone.utc).isoformat()

        update_response = requests.patch(
            tickets_url,
            headers=supabase_headers({
                "Prefer": "return=representation"
            }),
            params={
                "ticket_id": f"eq.{ticket_id}"
            },
            json={
                "status": "Resolved",
                "cso_response": resolution_message,
                "resolved_at": resolved_at
            }
        )

        update_response.raise_for_status()
        updated_rows = update_response.json()

        if not updated_rows:
            return jsonify({
                "error": "The ticket could not be updated."
            }), 500

        return jsonify({
            "message": (
                "Resolution message sent and ticket closed successfully."
            ),
            "ticket": updated_rows[0],
            "chatMessage": (
                inserted_messages[0]
                if inserted_messages
                else None
            ),
            "resolved_at": resolved_at
        }), 200

    except requests.RequestException as error:
        print("Resolve-with-message error:", str(error))

        response_text = ""

        if error.response is not None:
            response_text = error.response.text

        return jsonify({
            "error": (
                response_text
                or "Unable to send the resolution message."
            )
        }), 500


@app.route("/api/tickets/<ticket_id>/resolve", methods=["PATCH"])
def resolve_ticket(ticket_id):
    """Close a ticket and notify the user in the live chat."""

    tickets_url = f"{supabase_url}/rest/v1/support_tickets"
    messages_url = f"{supabase_url}/rest/v1/chat_messages"

    try:
        ticket_response = requests.get(
            tickets_url,
            headers=supabase_headers(),
            params={
                "ticket_id": f"eq.{ticket_id}",
                "select": "ticket_id,status",
                "limit": 1
            }
        )

        ticket_response.raise_for_status()
        ticket_rows = ticket_response.json()

        if not ticket_rows:
            return jsonify({
                "error": "Ticket not found."
            }), 404

        if ticket_rows[0].get("status") == "Resolved":
            return jsonify({
                "error": "This ticket has already been closed."
            }), 409

        resolved_at = datetime.now(timezone.utc).isoformat()

        update_response = requests.patch(
            tickets_url,
            headers=supabase_headers({
                "Prefer": "return=representation"
            }),
            params={
                "ticket_id": f"eq.{ticket_id}"
            },
            json={
                "status": "Resolved",
                "resolved_at": resolved_at
            }
        )

        update_response.raise_for_status()
        updated_rows = update_response.json()

        if not updated_rows:
            return jsonify({
                "error": "Ticket could not be closed."
            }), 500

        closure_message = (
            "This support ticket has been closed by the Customer Service "
            "Officer. Thank you for contacting UniHelp. If you still require "
            "assistance, please start a new live-support request."
        )

        message_response = requests.post(
            messages_url,
            headers=supabase_headers({
                "Prefer": "return=representation"
            }),
            json={
                "ticket_id": ticket_id,
                "sender": "system",
                "message": closure_message
            }
        )

        message_response.raise_for_status()
        inserted_messages = message_response.json()

        return jsonify({
            "message": "Ticket closed successfully.",
            "ticket": updated_rows[0],
            "closureMessage": (
                inserted_messages[0]
                if inserted_messages
                else None
            ),
            "resolved_at": resolved_at
        }), 200

    except requests.RequestException as error:
        print("Close-ticket error:", str(error))

        response_text = ""

        if error.response is not None:
            response_text = error.response.text

        return jsonify({
            "error": (
                response_text
                or "Unable to close the ticket."
            )
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000, use_reloader=True)