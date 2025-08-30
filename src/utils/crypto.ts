// Utility to generate SHA256 hash
export async function generateSha256Hash(data: string, secret?: string): Promise<string> {
  const textEncoder = new TextEncoder();
  const dataToHash = secret ? data + secret : data; // Append secret if provided
  const dataBuffer = textEncoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hexHash;
}