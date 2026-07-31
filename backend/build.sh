#!/usr/bin/env bash
# Render build script for the Django backend
# Self-locating: works no matter which directory Render starts the build in.
set -o errexit

cd "$(dirname "$0")"

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py seed_data
