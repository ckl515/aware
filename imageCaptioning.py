from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import requests
from io import BytesIO
import re
from urllib.parse import urljoin, urlparse
import base64

processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

def generate_caption(image_path_or_url, base_url=None):
    """
    Generate a caption for an image from URL, local path, or data URI
    
    Args:
        image_path_or_url: Image URL, local path, or data URI
        base_url: Base URL to resolve relative paths (optional)
    
    Returns:
        str: Generated caption for the image
    """
    try:
        image = None
        
        if image_path_or_url.startswith("data:image"):
            header, data = image_path_or_url.split(',', 1)
            image_data = base64.b64decode(data)
            image = Image.open(BytesIO(image_data)).convert("RGB")
            
        elif image_path_or_url.startswith(("http://", "https://")):
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(image_path_or_url, timeout=15, headers=headers)
            response.raise_for_status()
            image = Image.open(BytesIO(response.content)).convert("RGB")
            
        elif base_url and not image_path_or_url.startswith(("http://", "https://", "/")):
            full_url = urljoin(base_url, image_path_or_url)
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(full_url, timeout=15, headers=headers)
            response.raise_for_status()
            image = Image.open(BytesIO(response.content)).convert("RGB")
            
        elif base_url and image_path_or_url.startswith("/"):
            parsed_base = urlparse(base_url)
            full_url = f"{parsed_base.scheme}://{parsed_base.netloc}{image_path_or_url}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(full_url, timeout=15, headers=headers)
            response.raise_for_status()
            image = Image.open(BytesIO(response.content)).convert("RGB")
            
        else:
            image = Image.open(image_path_or_url).convert("RGB")
        
        if image is None:
            return "Unable to load image"
            
        # Generate caption
        inputs = processor(images=image, return_tensors="pt")
        out = model.generate(**inputs, max_length=50)
        caption = processor.decode(out[0], skip_special_tokens=True)
        
        # Clean up the caption
        caption = re.sub(r'^(a picture of |an image of |a photo of )', '', caption, flags=re.IGNORECASE)
        
        return caption.strip()
        
    except requests.exceptions.RequestException as e:
        print(f"Network error downloading image {image_path_or_url}: {e}")
        return f"Descriptive alt text needed (network error)"
    except requests.exceptions.Timeout as e:
        print(f"Timeout downloading image {image_path_or_url}: {e}")
        return f"Descriptive alt text needed (timeout)"
    except Exception as e:
        print(f"Error generating caption for {image_path_or_url}: {e}")
        return f"Descriptive alt text needed"

def extract_image_src_from_html(html_string):
    """
    Extract the src attribute from an img tag HTML string
    
    Args:
        html_string: HTML string containing an img tag
        
    Returns:
        str: The src attribute value, or None if not found
    """
    try:
        src_match = re.search(r'src\s*=\s*["\']([^"\']+)["\']', html_string, re.IGNORECASE)
        if src_match:
            return src_match.group(1)
        return None
    except Exception as e:
        print(f"Error extracting src from HTML: {e}")
        return None



