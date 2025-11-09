FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# RUN python scripts/init_database.py

EXPOSE 80

ENV FLASK_APP=web_app.py
ENV FLASK_RUN_HOST=0.0.0.0
ENV FLASK_RUN_PORT=8001
ENV DATABASE_URL=sqlite:///gold_prices.db

CMD ["flask", "run"]