import sqlite3

import anthropic, os
from dotenv import load_dotenv

load_dotenv()

from typing import Dict, Any


# Connect to SQLite database
conn = sqlite3.connect('db/locallens.db')
cursor = conn.cursor()

client = anthropic.Anthropic(
    api_key=os.getenv('ANTHROPIC_API_KEY'),
)



def process_input(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process and enhance user input for a POI.
    """
    prompt = f"""
    Enhance the following point of interest description:
    Location: Latitude {data['lat']}, Longitude {data['lng']}
    User description: {data['description']}

    Provide a concise, engaging description of this location. Include any relevant
    details or context that might be interesting for travelers. Maximum 3 short sentences.
    """

    response = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=1024,
        system="You are a helpful travel assistant.",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    enhanced_description = response.content[0].text
    print(enhanced_description)

    data['enhanced_description'] = enhanced_description
    return data

def generate_description(poi_data: Dict[str, Any]) -> str:
    """
    Generate a more detailed description for a POI.
    """
    prompt = f"""
    Create a detailed description for the following point of interest:
    Location: Latitude {poi_data['lat']}, Longitude {poi_data['lng']}
    Description: {poi_data['description']}
    Enhanced Description: {poi_data.get('enhanced_description', '')}

    Provide an engaging, informative paragraph about this location. Include any
    historical context, cultural significance, or travel tips if applicable.
    """

    response = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        max_tokens=1024,
        messages=[
            {"role": "system", "content": "You are a knowledgeable travel guide."},
            {"role": "user", "content": prompt}
        ]
    )

    return response.choices[0].message['content'].strip()

def answer_query(query: str, context: str = "") -> str:
    """
    Answer a user query about locations or activities.
    """
    prompt = f"""
    User query: {query}
    Context (if any): {context}

    Provide a helpful, concise answer to the user's query.
    If the context doesn't provide enough information, give a general response
    and suggest how the user might find more specific information. Give always a max of
    three/four suggestions. Prioritize your context.
    """
    response = client.messages.create(
        model="claude-3-5-sonnet-20240620",
        system="You are a helpful assistant that uses context to provide great hidden gems to travelers",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": prompt}
        ]
    )

    return response.content[0].text