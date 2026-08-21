import psycopg2
try:
    conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/postgres")
    print("Direct connection SUCCESS!")
    conn.close()
except Exception as e:
    print("Direct connection FAILED:", e)
