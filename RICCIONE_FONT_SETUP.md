# Riccione-DemiBold Font Setup Instructions

## ✅ What I've Already Done

I've updated the code to use **Riccione-DemiBold** as the primary font throughout 6Degree:

### Files Updated:
1. **`frontend/tailwind.config.ts`**
   - Added Riccione-DemiBold to the font family stack
   
2. **`frontend/src/index.css`**
   - Added @font-face declaration
   - Applied font to body element

---

## 📝 What You Need To Do

### Step 1: Add Font Files to Your Project

Create the fonts directory and add the Riccione-DemiBold font files:

```
frontend/
  public/
    fonts/
      Riccione-DemiBold.woff2  ← Best for modern browsers
      Riccione-DemiBold.woff   ← Fallback
      Riccione-DemiBold.ttf    ← Additional fallback
```

### Step 2: Font File Formats (in order of preference)

1. **WOFF2** (preferred) - Best compression, modern browser support
2. **WOFF** - Good fallback for older browsers
3. **TTF** - Universal fallback

You only need **WOFF2** for modern browsers, but having all three ensures maximum compatibility.

---

## 🔍 Where to Get Riccione-DemiBold

If you don't have the font files yet, you'll need to:

1. **Purchase/License** from the font foundry
2. **Convert** if you only have .otf or .ttf
   - Use online converters like:
     - https://cloudconvert.com/ttf-to-woff2
     - https://transfonter.org/
     - https://everythingfonts.com/

---

## 🎨 Font Applied To

✅ **Entire application** - All text elements  
✅ **Headings** - H1, H2, H3, etc.  
✅ **Body text** - Paragraphs, labels  
✅ **Buttons** - All CTAs and actions  
✅ **Navigation** - Sidebar, menus  
✅ **Cards** - All card content  
✅ **Modals** - All modal text  
✅ **Forms** - Input labels and text  

---

## 🧪 Testing

After adding the font files, verify it's working:

1. **Open DevTools** in your browser
2. **Inspect any text element**
3. **Check Computed styles** → Look for `font-family`
4. You should see: `Riccione-DemiBold, Inter, system-ui, sans-serif`

### If Font Doesn't Load:

Check browser console for errors like:
```
Failed to load resource: /fonts/Riccione-DemiBold.woff2
```

This means the font file is missing or the path is incorrect.

---

## 🎯 Font Path Options

### Current Setup (Static):
```css
src: url('/fonts/Riccione-DemiBold.woff2') format('woff2');
```

### Alternative (If using Vite):
```css
src: url('/public/fonts/Riccione-DemiBold.woff2') format('woff2');
```

### Alternative (If using assets folder):
```css
src: url('../assets/fonts/Riccione-DemiBold.woff2') format('woff2');
```

---

## 📦 Alternative: Use Google Fonts (If Available)

If Riccione-DemiBold is available on Google Fonts (unlikely for commercial fonts):

**In `index.html`:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Riccione:wght@600&display=swap" rel="stylesheet">
```

**Note**: Riccione is likely a commercial font and won't be on Google Fonts. You'll need to self-host.

---

## 🚀 Performance Tip

Use `font-display: swap` (already added) to prevent FOIT (Flash of Invisible Text):
- Shows fallback font immediately
- Swaps to Riccione-DemiBold when loaded
- Better user experience

---

## ✅ Checklist

- [ ] Add Riccione-DemiBold.woff2 to `/public/fonts/`
- [ ] (Optional) Add .woff and .ttf for better compatibility
- [ ] Test on localhost to verify font loads
- [ ] Check DevTools console for font errors
- [ ] Verify font rendering across pages

---

## 🎨 Visual Result

With Riccione-DemiBold + TRUE BLACK + MINIMAL GOLD, your app will have:

✨ **Bold, distinctive typography** (Riccione)  
✨ **Clean, high-contrast design** (Black & White)  
✨ **Premium accent** (Gold sparingly)  
✨ **CRED-level prestige aesthetic**  

---

## 📞 Support

If you encounter issues:
1. Check file path in browser DevTools Network tab
2. Verify font file format is correct
3. Try different font formats (woff2 → woff → ttf)
4. Check console for CORS errors if loading from CDN

---

**Status**: ✅ Code updated - Waiting for font files to be added to `/public/fonts/`

