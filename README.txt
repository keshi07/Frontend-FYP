1. Locate the Frontend-FYP folder.

2. Copy the universitychatbot-xxxxx.json file you received from Jade into this folder.

3. open cmd and run the follow step by step:

4. cd to Frontend-FYP folder
5. python --version
	- Ensure that it's Python 3.13.x, if not, please install python 3

6. python -m venv venv

7. venv\Scripts\activate

8. pip install flask flask-cors requests

9. python app.py

10. click on the  *Running on http://127.0.0.1:5000* to run the application

**important, do NOT include the json file inside the GitHub folder, otherwise you cannot push to GitHub and Dialogflow will auto disable the JSON key which will break the linkage**