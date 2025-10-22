import React, { useState } from 'react';
import './App.css';

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

const validateSSN = (ssn) => {
  return /^\d{9}$/.test(ssn);
};

const validateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age >= 18;
};

const validateField = (name, value) => {
  let error = '';
  
  switch(name) {
    case 'email_address':
      if (value && !validateEmail(value)) error = 'Invalid email format';
      break;
    case 'phone_number':
      if (value && !validatePhone(value)) error = 'Must be 10 digits';
      break;
    case 'document_ssn':
      if (value && !validateSSN(value)) error = 'Must be 9 digits, no dashes';
      break;
    case 'birth_date':
      if (value && !validateAge(value)) error = 'Must be 18 or older';
      break;
    case 'address_state':
      if (value && !/^[A-Z]{2}$/.test(value)) error = 'Must be 2-letter code (e.g., NY)';
      break;
    case 'address_postal_code':
      if (value && !/^\d{5}$/.test(value)) error = 'Must be 5 digits';
      break;
    default:
      break;
  }
  
  return error;
};

function App() {
  const [formData, setFormData] = useState({
    name_first: '',
    name_last: '',
    email_address: '',
    phone_number: '',
    address_line_1: '',
    address_line_2: '',
    address_city: '',
    address_state: '',
    address_postal_code: '',
    address_country_code: 'US',
    document_ssn: '',
    birth_date: ''
  });

  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    const trimmedValue = value.trim();
    
    setFormData({
      ...formData,
      [name]: trimmedValue
    });
    
    const error = validateField(name, trimmedValue);
    setFieldErrors({
      ...fieldErrors,
      [name]: error
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!validateEmail(formData.email_address)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!validatePhone(formData.phone_number)) {
      setError('Phone number must be 10 digits');
      setLoading(false);
      return;
    }

    if (!validateSSN(formData.document_ssn)) {
      setError('SSN must be exactly 9 digits with no dashes');
      setLoading(false);
      return;
    }

    if (!validateAge(formData.birth_date)) {
      setError('You must be at least 18 years old to apply');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setOutcome(data.outcome);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  if (outcome) {
    return (
      <div className="App outcome-screen">
        {outcome === 'Approved' && (
          <div className="outcome approved">
            <div className="icon">✓</div>
            <h1>Welcome aboard!</h1>
            <p>Your account has been successfully created.</p>
          </div>
        )}
        
        {outcome === 'Manual Review' && (
          <div className="outcome review">
            <div className="icon">⏳</div>
            <h1>We're reviewing your application</h1>
            <p>Thanks for applying! We'll be in touch shortly.</p>
          </div>
        )}
        
        {outcome === 'Denied' && (
          <div className="outcome denied">
            <div className="icon">✕</div>
            <h1>Application unsuccessful</h1>
            <p>We're unable to approve your application at this time.</p>
          </div>
        )}
        
        <button onClick={() => {
          setOutcome(null);
          setFormData({
            name_first: '',
            name_last: '',
            email_address: '',
            phone_number: '',
            address_line_1: '',
            address_line_2: '',
            address_city: '',
            address_state: '',
            address_postal_code: '',
            address_country_code: 'US',
            document_ssn: '',
            birth_date: ''
          });
          setFieldErrors({});
          setError(null);
        }} className="secondary-btn">
          Submit Another Application
        </button>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="container">
        <header>
          <div className="logo-container">
            <svg className="logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="#00C805"/>
              <path d="M12 8V16M8 10L12 8L16 10M8 14L12 16L16 14" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="brand-name">HobinRood</h1>
          </div>
          <p>Join millions of users. Apply in minutes.</p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Personal Information</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="name_first"
                  value={formData.name_first}
                  onChange={handleChange}
                  onKeyPress={(e) => {
                    if (!/[a-zA-Z\s]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="name_last"
                  value={formData.name_last}
                  onChange={handleChange}
                  onKeyPress={(e) => {
                    if (!/[a-zA-Z\s]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email_address"
                value={formData.email_address}
                onChange={handleChange}
                className={fieldErrors.email_address ? 'invalid' : formData.email_address ? 'valid' : ''}
                required
              />
              {fieldErrors.email_address && (
                <div className="field-error">{fieldErrors.email_address}</div>
              )}
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="5551234567"
                maxLength="10"
                className={fieldErrors.phone_number ? 'invalid' : formData.phone_number ? 'valid' : ''}
                required
              />
              {fieldErrors.phone_number && (
                <div className="field-error">{fieldErrors.phone_number}</div>
              )}
            </div>

            <div className="form-group">
              <label>Social Security Number</label>
              <input
                type="text"
                name="document_ssn"
                value={formData.document_ssn}
                onChange={handleChange}
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="123456789"
                maxLength="9"
                className={fieldErrors.document_ssn ? 'invalid' : formData.document_ssn ? 'valid' : ''}
                required
              />
              {fieldErrors.document_ssn && (
                <div className="field-error">{fieldErrors.document_ssn}</div>
              )}
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
                className={fieldErrors.birth_date ? 'invalid' : formData.birth_date ? 'valid' : ''}
                required
              />
              {fieldErrors.birth_date && (
                <div className="field-error">{fieldErrors.birth_date}</div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h2>Address</h2>
            
            <div className="form-group">
              <label>Address Line 1</label>
              <input
                type="text"
                name="address_line_1"
                value={formData.address_line_1}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Address Line 2 (Optional)</label>
              <input
                type="text"
                name="address_line_2"
                value={formData.address_line_2}
                onChange={handleChange}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="address_city"
                  value={formData.address_city}
                  onChange={handleChange}
                  onKeyPress={(e) => {
                    if (!/[a-zA-Z\s]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>State</label>
                <input
                  type="text"
                  name="address_state"
                  value={formData.address_state}
                  onChange={handleChange}
                  onKeyPress={(e) => {
                    if (!/[a-zA-Z]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="NY"
                  maxLength="2"
                  className={fieldErrors.address_state ? 'invalid' : formData.address_state ? 'valid' : ''}
                  required
                />
                {fieldErrors.address_state && (
                  <div className="field-error">{fieldErrors.address_state}</div>
                )}
              </div>

              <div className="form-group">
                <label>Zip Code</label>
                <input
                  type="text"
                  name="address_postal_code"
                  value={formData.address_postal_code}
                  onChange={handleChange}
                  onKeyPress={(e) => {
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="10001"
                  maxLength="5"
                  className={fieldErrors.address_postal_code ? 'invalid' : formData.address_postal_code ? 'valid' : ''}
                  required
                />
                {fieldErrors.address_postal_code && (
                  <div className="field-error">{fieldErrors.address_postal_code}</div>
                )}
              </div>
              
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  name="address_country_code"
                  value="US"
                  disabled
                  style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;