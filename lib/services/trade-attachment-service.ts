export interface TradeAttachment {
  id: string;
  tradeId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttachmentUploadResult {
  id: string;
  url: string;
  filename: string;
  size: number;
}

// Storage interface - can be implemented for different providers
export interface StorageProvider {
  upload(file: File, path: string): Promise<{ url: string; filename: string }>;
  delete(filename: string): Promise<void>;
  getSignedUrl?(filename: string, expiresIn?: number): Promise<string>;
}

// Local filesystem storage implementation for development
export class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor(uploadDir = './uploads/trade-attachments') {
    this.uploadDir = uploadDir;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async upload(file: File, _path: string): Promise<{ url: string; filename: string }> {
    const filename = `${Date.now()}-${file.name}`;
    const url = `/api/uploads/${filename}`;
    
    // Placeholder - actual implementation would write to filesystem
    console.warn('LocalStorageProvider upload called - implementation needed');
    
    return { url, filename };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_filename: string): Promise<void> {
    console.warn('LocalStorageProvider delete called - implementation needed');
  }
}

// S3-compatible storage provider for production
export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;

  constructor(bucket: string, region: string) {
    this.bucket = bucket;
    this.region = region;
  }

  async upload(file: File, path: string): Promise<{ url: string; filename: string }> {
    const filename = `${path}/${Date.now()}-${file.name}`;
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filename}`;
    
    console.warn('S3StorageProvider upload called - AWS SDK implementation needed');
    
    return { url, filename };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_filename: string): Promise<void> {
    console.warn('S3StorageProvider delete called - AWS SDK implementation needed');
  }

  async getSignedUrl(filename: string, expiresIn = 3600): Promise<string> {
    console.warn('S3StorageProvider getSignedUrl called - AWS SDK implementation needed');
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filename}?expires=${expiresIn}`;
  }
}

export class TradeAttachmentService {
  private storageProvider: StorageProvider;

  constructor(storageProvider?: StorageProvider) {
    this.storageProvider = storageProvider || new LocalStorageProvider();
  }

  async uploadAttachment(
    tradeId: string, 
    userId: string, 
    file: File
  ): Promise<AttachmentUploadResult> {
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are supported');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size must be less than 10MB');
    }

    const path = `users/${userId}/trades/${tradeId}`;
    const { url, filename } = await this.storageProvider.upload(file, path);

    console.warn('Database save needed - TradeAttachment table');
    
    return {
      id: `attachment-${Date.now()}`,
      url,
      filename,
      size: file.size
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async deleteAttachment(_attachmentId: string, _userId: string): Promise<boolean> {
    console.warn('TradeAttachmentService deleteAttachment - implementation needed');
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listAttachments(_tradeId: string, _userId: string): Promise<TradeAttachment[]> {
    console.warn('TradeAttachmentService listAttachments - implementation needed');
    return [];
  }
}

// Utility function to create storage provider based on environment
export function createStorageProvider(): StorageProvider {
  if (process.env.NODE_ENV === 'production' && process.env.S3_BUCKET) {
    return new S3StorageProvider(
      process.env.S3_BUCKET,
      process.env.S3_REGION || 'us-east-1'
    );
  }
  
  return new LocalStorageProvider();
}

// Utility to validate and process uploaded files
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not supported. Please use JPEG, PNG, GIF, or WebP.' };
  }
  
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'File size must be less than 10MB.' };
  }
  
  return { valid: true };
}
