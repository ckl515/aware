from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import requests
from io import BytesIO

processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

def generateCaption(path):
    if path.startswith("http://") or path.startswith("https://"):
        # Load image from URL
        response = requests.get(path)
        image = Image.open(BytesIO(response.content)).convert("RGB")
    else:
        # Load image from local file
        image = Image.open(path).convert("RGB")
    inputs = processor(images=image, return_tensors="pt")
    out = model.generate(**inputs)
    caption = processor.decode(out[0], skip_special_tokens=True)
    print(caption)

