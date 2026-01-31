FROM mongo:6

# Create directory for database
RUN mkdir -p /data/db

EXPOSE 27017

CMD ["mongod", "--bind_ip_all"]
