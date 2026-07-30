SUPPORTED_COUNTRIES = {
    "TZ": {
        "name": "Tanzania",
        "calling_code": "255",
        "national_pattern": r"^[67]\d{8}$",
    },
    "KE": {
        "name": "Kenya",
        "calling_code": "254",
        "national_pattern": r"^[17]\d{8}$",
    },
    "UG": {
        "name": "Uganda",
        "calling_code": "256",
        "national_pattern": r"^7\d{8}$",
    },
}

SUPPORTED_COUNTRY_CHOICES = [
    (code, details["name"]) for code, details in SUPPORTED_COUNTRIES.items()
]
