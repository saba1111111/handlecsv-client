# Project Setup


## Steps to Run

1. Clone the project repository:

   ```bash
   git clone https://github.com/saba1111111/handlecsv-client.git
   cd handlecsv-client
   ```

2. Run the project using Docker Compose:

   ```bash
   npm install
   npm run dev
   ```

## How the Project Works

When a user uploads a CSV file via the frontend, the file is divided into smaller chunks of 1 MB each. These chunks are then streamed to the backend one at a time to ensure efficient and reliable data transfer. When the backend receives the chunks via streams, the server streams the data into a BullMQ queue. Worker jobs subscribe to this queue and, as soon as new events appear in the queue, they start processing the data in the background. After the entire file's chunks have been streamed to the queue, the server responds to the client with a success message and continues processing the file data in the background.

Processing the data in the background involves several checks and operations. Each row is validated individually to ensure all required columns are present and that their data types are correct. If a row already exists in the database, it is skipped to avoid duplication. For rows with missing fields, an HTTP call is made to a remote server to fetch the missing data and combine it with the existing data. If the row is missing the `price` field and the HTTP request fails to retrieve this information, the system queries the database to find the minimum price and assigns it to the new row. Once all these steps are successfully completed, the processed row is saved in the database.

Every row failure during processing is logged, including the exact row that failed and the reason for the failure.

During processing, progress is tracked in Redis. The total number of rows to be processed is saved in Redis, and after each job processes a row, the result is updated in Redis. This includes whether the row was successfully saved or identified as a duplicate.

Clients can use polling to check the status and statistics of the file processing. Every five seconds, the client sends a request to the server to retrieve the current processing statistics. The server responds with details on how many rows have been processed so far, their statuses (e.g., successfully processed or failed), and reasons for any failures.

After the file has been successfully processed, the client can send a request to display the processed data in a table format with pagination, allowing efficient navigation through the stored data.
