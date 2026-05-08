import os

file_path = '/home/jp/JPIndia_Github-master/frontend/lib/database.types.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Replace literal \n with actual newlines
fixed_content = content.replace('\\n', '\n')

with open(file_path, 'w') as f:
    f.write(fixed_content)

print("File fixed.")
