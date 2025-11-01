# Emoji & Media Sharing Implementation - TODO

## ✅ Completed

1. **Storage Setup**
   - Created `message-media` bucket in Supabase
   - Set up security policies (CRUD operations)
   - Added migration `063_create_message_media_bucket.sql`
   - Installed `emoji-picker-react` package

2. **Backend Setup**
   - Added `media_type` and `media_size` columns to messages table
   - Updated message_type constraint to include image/video/document
   - Set up file size limit (50MB)
   - Configured allowed MIME types

3. **Frontend - Partial**
   - Added emoji picker import
   - Added media upload handler functions
   - Added file validation (50MB limit)
   - Added toast notifications for uploads

## 🚧 TODO - Complete These Steps

### 1. Update Message Rendering (ChatModal.tsx)

Add rendering for image/video/document messages before the regular text message rendering:

```typescript
// Around line 330-370, before regular text message rendering
// Add special rendering for media messages
if (message.message_type === 'image') {
  return (
    <div key={message.message_id} className={`flex ${message.is_own_message ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[70%]">
        <img 
          src={message.metadata?.media_public_url || ''}
          alt={message.content}
          className="rounded-lg max-h-96 cursor-pointer hover:opacity-90 transition"
          onClick={() => window.open(message.metadata?.media_public_url, '_blank')}
        />
        {isLastFromSender && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatMessageTime(message.sent_at)}
            {message.is_own_message && (
              message.read_at ? <CheckCheck className="h-3 w-3 text-blue-500 inline ml-1" /> : <CheckCheck className="h-3 w-3 opacity-50 inline ml-1" />
            )}
          </p>
        )}
      </div>
    </div>
  );
}

if (message.message_type === 'video') {
  return (
    <div key={message.message_id} className={`flex ${message.is_own_message ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[70%]">
        <video 
          src={message.metadata?.media_public_url || ''}
          controls
          className="rounded-lg max-h-96"
        />
        {isLastFromSender && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatMessageTime(message.sent_at)}
            {message.is_own_message && (
              message.read_at ? <CheckCheck className="h-3 w-3 text-blue-500 inline ml-1" /> : <CheckCheck className="h-3 w-3 opacity-50 inline ml-1" />
            )}
          </p>
        )}
      </div>
    </div>
  );
}

if (message.message_type === 'document') {
  return (
    <div key={message.message_id} className={`flex ${message.is_own_message ? 'justify-end' : 'justify-start'}`}>
      <div className={`px-3 py-2 rounded-lg border ${
        message.is_own_message ? 'bg-primary text-primary-foreground' : 'bg-muted'
      }`}>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium">{message.metadata?.media_name || message.content}</p>
            <p className="text-xs opacity-70">{formatFileSize(message.media_size)}</p>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => window.open(message.metadata?.media_public_url, '_blank')}
          >
            Download
          </Button>
        </div>
        {isLastFromSender && (
          <p className="text-xs opacity-70 mt-1">
            {formatMessageTime(message.sent_at)}
            {message.is_own_message && (
              message.read_at ? <CheckCheck className="h-3 w-3 text-blue-500 inline ml-1" /> : <CheckCheck className="h-3 w-3 opacity-50 inline ml-1" />
            )}
          </p>
        )}
      </div>
    </div>
  );
}
```

### 2. Add formatFileSize Helper Function

```typescript
const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
```

### 3. Update Message Input UI (Around line 485-520)

Replace the message input section with:

```typescript
{/* Message Input */}
<div className="p-4 border-t">
  {/* Hidden file input */}
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
    onChange={handleFileSelect}
    className="hidden"
  />
  
  {/* Emoji Picker */}
  {showEmojiPicker && (
    <div className="absolute bottom-20 right-4 z-50">
      <EmojiPicker
        onEmojiClick={onEmojiClick}
        width={350}
        height={400}
      />
    </div>
  )}
  
  {uploadingMedia && (
    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Uploading media...</span>
    </div>
  )}
  
  <div className="flex space-x-2">
    {/* Emoji Button */}
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
      disabled={!canType}
      title="Add emoji"
    >
      <Smile className="h-5 w-5" />
    </Button>
    
    {/* File Attachment Button */}
    <Button
      size="sm"
      variant="ghost"
      onClick={() => fileInputRef.current?.click()}
      disabled={!canType || uploadingMedia}
      title="Attach file"
    >
      <Paperclip className="h-5 w-5" />
    </Button>
    
    {/* Message Input */}
    <Input
      ref={inputRef}
      value={messageText}
      onChange={(e) => setMessageText(e.target.value)}
      onKeyPress={handleKeyPress}
      placeholder={canType ? "Type a message..." : "Connecting..."}
      disabled={!canType}
      className="flex-1 text-sm"
      maxLength={2000}
    />
    
    {/* Send Button */}
    <Button
      size="sm"
      onClick={handleSendMessage}
      disabled={!canType || (!messageText.trim() && !uploadingMedia)}
    >
      {sending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
    </Button>
  </div>
  
  {messageText.length > 1900 && (
    <p className="text-xs text-muted-foreground mt-1">
      {2000 - messageText.length} characters remaining
    </p>
  )}
</div>
```

### 4. Close Emoji Picker on Outside Click

Add useEffect for closing emoji picker:

```typescript
// Close emoji picker when clicking outside
useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (showEmojiPicker && !(e.target as Element).closest('.emoji-picker-react')) {
      setShowEmojiPicker(false);
    }
  };
  
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showEmojiPicker]);
```

## 📝 Testing Checklist

After implementing:

- [ ] Test emoji picker opens and closes correctly
- [ ] Test inserting emojis into message
- [ ] Test uploading image (JPG, PNG, GIF, WebP)
- [ ] Test uploading video (MP4, MOV, WebM)
- [ ] Test uploading document (PDF, Word, Excel)
- [ ] Test file size validation (reject > 50MB)
- [ ] Test file type validation (reject unsupported types)
- [ ] Test media displays correctly in chat
- [ ] Test clicking image opens in new tab
- [ ] Test video player controls work
- [ ] Test document download link works
- [ ] Test read receipts on media messages
- [ ] Test media on both sent and received messages
- [ ] Test loading states during upload
- [ ] Test error handling (network issues, permission errors)

## 🎨 Optional Enhancements

- [ ] Image compression before upload (reduce file size)
- [ ] Video thumbnail preview
- [ ] Drag and drop file upload
- [ ] Paste image from clipboard
- [ ] Image gallery viewer (swipe through images)
- [ ] Voice message recording
- [ ] Message reactions (👍 ❤️ 😂 etc.)
- [ ] Reply to specific messages
- [ ] Forward messages

## 📚 Documentation

- Update task-recipes.json with media sharing task
- Add to AI assistant knowledge base
- Create user guide for media sharing

