import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { handleStreamResponse } from "./utils";
import "./app.css";
import { IFileOrdersProcessData, IOrder } from "./interfaces";
import { EOrderProcessingStatus } from "./constants";

function App() {
  const [fileData, setFileData] = useState<{ name: string } | null>(null);
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;
  const chunkSize = 1024 * 1024;

  const [orderProcessingStatus, setOrderProcessingStatus] =
    useState<IFileOrdersProcessData>();

  useEffect(() => {
    if (
      orderProcessingStatus
        ? orderProcessingStatus.status === EOrderProcessingStatus.COMPLETED
        : true
    ) {
      fetchOrders(currentPage, itemsPerPage);
    }
  }, [currentPage, orderProcessingStatus]);

  useEffect(() => {
    let statusInterval: ReturnType<typeof setInterval> | null = null;

    if (
      fileData &&
      (!orderProcessingStatus ||
        orderProcessingStatus.status !== EOrderProcessingStatus.COMPLETED)
    ) {
      statusInterval = setInterval(() => {
        checkFileStatus(fileData.name);
      }, 500);
    }

    return () => {
      if (statusInterval !== null) clearInterval(statusInterval);
    };
  }, [fileData, orderProcessingStatus]);

  const checkFileStatus = async (fileName: string) => {
    try {
      const response = await fetch(
        "http://localhost:8080/orders/processing/" + fileName
      );
      const data = await response.json();
      setOrderProcessingStatus(data);
    } catch (error) {
      console.error("Error checking file status:", error);
    }
  };

  const fetchOrders = async (page: number, numberOfItemsPerPage: number) => {
    try {
      const response = await fetch(
        `http://localhost:8080/orders?page=${page}&numberOfItemsPerPage=${numberOfItemsPerPage}`
      );
      const data = await response.json();
      setOrders(data.orders);
      setCurrentPage(data.page);
      setTotalPages(data.totalNumberOfPages);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleFileUpload = async (file: File) => {
    const maxFileSize = 10 * 1024 * 1024;

    if (!file.name.endsWith(".csv")) {
      alert("Only .csv files are supported");
      return;
    }

    if (file.size > maxFileSize) {
      alert("File size exceeds the 10MB limit");
      return;
    }
    if (fileData) {
      setFileData(null);
      setOrderProcessingStatus(undefined);
      setCurrentPage(1);
      setTotalPages(1);
    }

    const totalChunks = Math.ceil(file.size / chunkSize);
    const fileName = uuidv4() + "_" + file.name;
    setFileData({ name: fileName });
    let uploadedChunks = 0;

    for (let start = 0; start < file.size; start += chunkSize) {
      const chunk = file.slice(start, start + chunkSize);
      const isLastChunk = start + chunkSize >= file.size;

      try {
        await uploadChunk(
          chunk,
          fileName,
          uploadedChunks,
          totalChunks,
          isLastChunk
        );
        uploadedChunks++;
      } catch (error) {
        console.error("Failed to upload chunk:", error);
        break;
      }
    }
  };

  const uploadChunk = async (
    chunk: Blob,
    fileName: string,
    chunkIndex: number,
    totalChunks: number,
    isLastChunk: boolean
  ) => {
    const formData = new FormData();
    formData.append("fileChunk", chunk);
    formData.append("fileName", fileName);
    formData.append("fileChunkIndex", chunkIndex.toString());
    formData.append("totalChunks", totalChunks.toString());
    formData.append("isLastChunk", isLastChunk.toString());

    await fetch("http://localhost:8080/orders/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => handleStreamResponse(response))
      .then((result) => {
        console.log("Final Result Data:", result);
      })
      .catch((error) => {
        console.error("Error processing response stream:", error);
      });
  };

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const fileInput = e.target;
          const file = fileInput.files?.[0];

          if (file) {
            handleFileUpload(file);
            fileInput.value = "";
          }
        }}
      />
      <div>
        {orderProcessingStatus && (
          <div>
            <p>Status: {orderProcessingStatus.status}</p>
            <p>Total Orders: {orderProcessingStatus.totalOrders}</p>
            <p>
              Duplicate Orders: {orderProcessingStatus.duplicateOrdersCount}
            </p>
            <p>
              Validation Failed Orders:
              {orderProcessingStatus.validationFailedOrdersCount}
            </p>
            <p>
              Successfully Processed Orders:
              {orderProcessingStatus.successfullyProcessedCount}
            </p>
          </div>
        )}
      </div>

      <h2>Orders</h2>
      <div className="table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer ID</th>
              <th>Product Name</th>
              <th>Product ID</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Order Date</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customer_id}</td>
                  <td>{order.product_name}</td>
                  <td>{order.product_id}</td>
                  <td>{order.quantity}</td>
                  <td>{order.price}</td>
                  <td>{order.order_date}</td>
                  <td>{order.category}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7}>No orders found</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
