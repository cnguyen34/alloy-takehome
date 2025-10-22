from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from requests.auth import HTTPBasicAuth
import os
from dotenv import load_dotenv
import re
import logging
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

load_dotenv()


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


WORKFLOW_TOKEN = os.getenv("WORKFLOW_TOKEN")
WORKFLOW_SECRET = os.getenv("WORKFLOW_SECRET")
url = "https://sandbox.alloy.co/v1/evaluations/"



app = Flask(__name__)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["100 per hour"],
    storage_uri="memory://"
)


CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

FIELD_NAMES = {
    'name_first': 'First Name',
    'name_last': 'Last Name',
    'email_address': 'Email Address',
    'phone_number': 'Phone Number',
    'address_line_1': 'Address Line 1',
    'address_line_2': 'Address Line 2',
    'address_city': 'City',
    'address_state': 'State',
    'address_postal_code': 'Postal Code',
    'address_country_code': 'Country',
    'document_ssn': 'Social Security Number',
    'birth_date': 'Date of Birth'
}



def validate_format(data):
    if 'document_ssn' in data:
        if not re.match(r'^\d{9}$', data['document_ssn']):
            return False, "SSN must be exactly 9 digits with no dashes"
    
    if 'birth_date' in data:
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', data['birth_date']):
            return False, "Date of Birth must be in YYYY-MM-DD format"
    
    if 'address_state' in data:
        if not re.match(r'^[A-Z]{2}$', data['address_state']):
            return False, "State must be a 2-letter code (e.g., NY, CA)"
    
    if 'address_country_code' in data and data['address_country_code'] != 'US':
        return False, "Country must be 'US'"
    
    return True, None


@app.route('/submit', methods=['POST'])
@limiter.limit("5 per minute")
def submit_app():
    try:
        data = request.get_json()
        logger.info("Received application submission")

        required_fields = ['name_first', 'name_last', 'email_address', 'phone_number',
            'address_line_1', 'address_city', 'address_state', 
            'address_postal_code', 'address_country_code',
            'document_ssn', 'birth_date']
        
        for field in required_fields:
            if field not in data or not data[field]:
                clean_name = FIELD_NAMES.get(field, field)
                logger.warning(f"Missing field: {clean_name}")
                return jsonify({"error": f"Missing required field: {clean_name}"}), 400
        
        if 'email_address' in data:
            email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
            if not re.match(email_pattern, data['email_address']):
                logger.warning("Invalid email format")
                return jsonify({"error": "Invalid email format"}), 400
        
        if 'phone_number' in data:
            phone_clean = re.sub(r'\D', '', data['phone_number'])
            if len(phone_clean) != 10:
                logger.warning("Phone number must be 10 digits")
                return jsonify({"error": "Phone number must be 10 digits"}), 400
        
        if 'birth_date' in data:
            from datetime import datetime
            birth = datetime.strptime(data['birth_date'], '%Y-%m-%d')
            today = datetime.today()
            age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
            if age < 18:
                logger.warning("Applicant must be at least 18 years old")
                return jsonify({"error": "Must be at least 18 years old"}), 400
        
        if 'address_postal_code' in data:
            if not re.match(r'^\d{5}$', data['address_postal_code']):
                logger.warning("Invalid postal code format")
                return jsonify({"error": "Postal code must be 5 digits"}), 400
            
        is_valid, error_message = validate_format(data)
        if not is_valid:
            logger.warning(f"Validation failed: {error_message}")
            return jsonify({ "error": error_message}), 400
        
        logger.info("Calling Alloy API")
        response = requests.post(
            url,
            json=data,
            auth=HTTPBasicAuth(WORKFLOW_TOKEN, WORKFLOW_SECRET),
            timeout=30
        )
        logger.info(f"Alloy response: {response.status_code}")
        
        if response.status_code != 201:
            logger.error(f"Alloy API error: {response.status_code}")
            return jsonify({"error": "Alloy API error"}), response.status_code
        
        alloy_response = response.json()
        outcome = alloy_response['summary']['outcome']
        logger.info(f"Outcome: {outcome}")
        
        return jsonify({
            "outcome": outcome,
            "evaluation_token": alloy_response.get('evaluation_token')
        }), 200
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({"error": "Invalid data format"}), 400
    
    except requests.exceptions.ConnectionError:
        logger.error("Connection error to Alloy API")
        return jsonify({"error": "Unable to connect to verification service"}), 503
    
    except requests.exceptions.Timeout:
        logger.error("Request timed out")
        return jsonify({"error": "Request timed out. Please try again."}), 504
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500

if __name__ == '__main__':
    logger.info("Starting Flask app on port 5001")
    app.run(debug=True, port=5001)
