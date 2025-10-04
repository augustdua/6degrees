# Coin Animation Component

A LeetCode-style coin animation that appears when users earn credits.

## Features

- **Floating coin animation** with 3D rotation effect
- **Fade in/out** with smooth transitions
- **Credit amount display** with gradient text
- **Automatic queue management** for multiple animations
- **Non-blocking** - doesn't interfere with user interactions

## Usage

### 1. Wrap your app with CoinAnimationManager

Already done in `App.tsx`:

```tsx
import { CoinAnimationManager } from './components/CoinAnimation';

<CoinAnimationManager>
  {/* Your app content */}
</CoinAnimationManager>
```

### 2. Trigger animations programmatically

```tsx
import { triggerCoinAnimation } from '@/components/CoinAnimation';

// Show +5 credits animation
triggerCoinAnimation(5);

// Show +10 credits animation
triggerCoinAnimation(10);
```

### 3. Automatic triggering in useCredits hook

The `useCredits` hook automatically triggers coin animations when credits are earned:

```tsx
const { awardCredits } = useCredits();

// This will automatically show the coin animation
await awardCredits(5, 'referral_join', 'Earned from referral');
```

## Animation Details

- **Duration**: 2 seconds
- **Motion**: Float up 80px, rotate 540°, scale up then down
- **Timing**: Cubic bezier easing for smooth motion
- **Color**: Yellow/amber gradient matching credit theme

## Testing

You can test the animation by calling:

```tsx
triggerCoinAnimation(5); // Test with 5 credits
```

Or by triggering any action that awards credits (e.g., someone joining via your referral link).

## How It Works

1. When credits are earned, `triggerCoinAnimation(amount)` is called
2. A coin event is added to the global queue
3. The `CoinAnimationManager` renders a `CoinAnimation` component
4. The coin floats up, rotates, and fades out over 2 seconds
5. After 2.1 seconds, the animation is automatically cleaned up
6. Multiple animations can play simultaneously

## Customization

To modify the animation, edit the CSS keyframes in `CoinAnimation.tsx`:

- `coinFloat` - Controls the coin movement and rotation
- `textFadeIn` - Controls the credit amount text animation
