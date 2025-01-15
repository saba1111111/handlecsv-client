export function handleStreamResponse(response: Response) {
  if (!response.body || !(response.body instanceof ReadableStream)) {
    throw new Error("Response body is not a readable stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulatedData = "";

  const processStream = (
    result: ReadableStreamReadResult<Uint8Array>
  ): Promise<void> => {
    const { done, value } = result;

    if (done) {
      return Promise.resolve();
    }

    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      accumulatedData += chunk;
    }

    return reader.read().then(processStream);
  };

  return reader
    .read()
    .then(processStream)
    .then(() => accumulatedData);
}
