# Lucky Store Unified Design System

## Overview

Single source of truth for design tokens across **Web Admin** (React/Tailwind) and **Mobile App** (Flutter).

## Token Mapping

| Token | Web (CSS) | Flutter (Dart) |
|-------|-----------|----------------|
| **Background Default** | `--color-background-default: #F8FAFC` | `AppColors.backgroundDefault = Color(0xFFF8FAFC)` |
| **Background Subtle** | `--color-background-subtle: #F1F5F9` | `AppColors.backgroundSubtle = Color(0xFFF1F5F9)` |
| **Surface Default** | `--color-surface-default: #FFFFFF` | `AppColors.surfaceDefault = Color(0xFFFFFFFF)` |
| **Surface Raised** | `--color-surface-raised: #FFFFFF` | `AppColors.surfaceRaised = Color(0xFFFFFFFF)` |
| **Primary Default** | `--color-primary-default: #E8B84B` | `AppColors.primaryDefault = Color(0xFFE8B84B)` |
| **Primary Hover** | `--color-primary-hover: #D4941A` | `AppColors.primaryHover = Color(0xFFD4941A)` |
| **Primary Pressed** | `--color-primary-pressed: #B0781A` | `AppColors.primaryPressed = Color(0xFFB0781A)` |
| **Primary Subtle** | `--color-primary-subtle: #FEF3C7` | `AppColors.primarySubtle = Color(0xFFFEF3C7)` |
| **Primary On** | `--color-primary-on: #1E293B` | `AppColors.primaryOn = Color(0xFF1E293B)` |
| **Secondary Default** | `--color-secondary-default: #0D9488` | `AppColors.secondaryDefault = Color(0xFF0D9488)` |
| **Secondary Hover** | `--color-secondary-hover: #0F766E` | `AppColors.secondaryHover = Color(0xFF0F766E)` |
| **Secondary Subtle** | `--color-secondary-subtle: #F0FDFA` | `AppColors.secondarySubtle = Color(0xFFF0FDFA)` |
| **Secondary On** | `--color-secondary-on: #FFFFFF` | `AppColors.secondaryOn = Color(0xFFFFFFFF)` |
| **Success Default** | `--color-success-default: #22C55E` | `AppColors.successDefault = Color(0xFF22C55E)` |
| **Success Dark** | `--color-success-dark: #15803D` | `AppColors.successDark = Color(0xFF15803D)` |
| **Success Subtle** | `--color-success-subtle: #F0FDF4` | `AppColors.successSubtle = Color(0xFFF0FDF4)` |
| **Success On** | `--color-success-on: #FFFFFF` | `AppColors.successOn = Color(0xFFFFFFFF)` |
| **Danger Default** | `--color-danger-default: #EF4444` | `AppColors.dangerDefault = Color(0xFFEF4444)` |
| **Danger Dark** | `--color-danger-dark: #B91C1C` | `AppColors.dangerDark = Color(0xFFB91C1C)` |
| **Danger Subtle** | `--color-danger-subtle: #FFF1F2` | `AppColors.dangerSubtle = Color(0xFFFFF1F2)` |
| **Danger On** | `--color-danger-on: #FFFFFF` | `AppColors.dangerOn = Color(0xFFFFFFFF)` |
| **Warning Default** | `--color-warning-default: #FBBF24` | `AppColors.warningDefault = Color(0xFFFBBF24)` |
| **Warning Dark** | `--color-warning-dark: #D97706` | `AppColors.warningDark = Color(0xFFD97706)` |
| **Warning Subtle** | `--color-warning-subtle: #FFFBEB` | `AppColors.warningSubtle = Color(0xFFFFFBEB)` |
| **Warning On** | `--color-warning-on: #1E293B` | `AppColors.warningOn = Color(0xFF1E293B)` |
| **Info Default** | `--color-info-default: #3B82F6` | `AppColors.infoDefault = Color(0xFF3B82F6)` |
| **Info Subtle** | `--color-info-subtle: #EFF6FF` | `AppColors.infoSubtle = Color(0xFFEFF6FF)` |
| **Info On** | `--color-info-on: #FFFFFF` | `AppColors.infoOn = Color(0xFFFFFFFF)` |
| **Border Default** | `--color-border-default: #E2E8F0` | `AppColors.borderDefault = Color(0xFFE2E8F0)` |
| **Border Strong** | `--color-border-strong: #94A3B8` | `AppColors.borderStrong = Color(0xFF94A3B8)` |
| **Text Primary** | `--color-text-primary: #0F172A` | `AppColors.textPrimary = Color(0xFF0F172A)` |
| **Text Secondary** | `--color-text-secondary: #475569` | `AppColors.textSecondary = Color(0xFF475569)` |
| **Text Muted** | `--color-text-muted: #94A3B8` | `AppColors.textMuted = Color(0xFF94A3B8)` |
| **Text Inverse** | `--color-text-inverse: #FFFFFF` | `AppColors.textInverse = Color(0xFFFFFFFF)` |
| **Text Link** | `--color-text-link: #4F46E5` | `AppColors.textLink = Color(0xFF4F46E5)` |

## Typography

### Font Family
- **Web:** `'Hind Siliguri', 'Inter', sans-serif`
- **Flutter:** `HindSiliguri` (custom font family)

### Type Scale

| Style | Web | Flutter |
|-------|-----|---------|
| **Display** | `32px / 1.2 / 700` | `AppTextStyles.display` |
| **Heading XL** | `24px / 1.3 / 700` | `AppTextStyles.headingXl` |
| **Heading LG** | `20px / 1.3 / 600` | `AppTextStyles.headingLg` |
| **Heading MD** | `16px / 1.4 / 600` | `AppTextStyles.headingMd` |
| **Body LG** | `15px / 1.5 / 400` | `AppTextStyles.bodyLg` |
| **Body MD** | `14px / 1.5 / 400` | `AppTextStyles.bodyMd` |
| **Body SM** | `13px / 1.5 / 400` | `AppTextStyles.bodySm` |
| **Label LG** | `14px / 1.2 / 500` | `AppTextStyles.labelLg` |
| **Label MD** | `13px / 1.2 / 500` | `AppTextStyles.labelMd` |
| **Label SM** | `11px / 1.2 / 500` | `AppTextStyles.labelSm` |

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` / `AppSpacing.space1` | 4px | Tight padding, icon gaps |
| `--space-2` / `AppSpacing.space2` | 8px | Small padding, inline gaps |
| `--space-3` / `AppSpacing.space3` | 12px | Default component padding |
| `--space-4` / `AppSpacing.space4` | 16px | Card padding, section gaps |
| `--space-5` / `AppSpacing.space5` | 20px | Large component padding |
| `--space-6` / `AppSpacing.space6` | 24px | Section padding |
| `--space-8` / `AppSpacing.space8` | 32px | Large sections |
| `--space-10` / `AppSpacing.space10` | 40px | Page-level spacing |
| `--space-12` / `AppSpacing.space12` | 48px | Major sections |
| `--space-16` / `AppSpacing.space16` | 64px | Page margins |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-none` / `AppRadius.none` | 0px | Sharp corners |
| `--radius-xs` / `AppRadius.xs` | 4px | Small elements, tags |
| `--radius-sm` / `AppRadius.sm` | 8px | Buttons, inputs |
| `--radius-md` / `AppRadius.md` | 12px | Cards, panels |
| `--radius-lg` / `AppRadius.lg` | 16px | Modals, dialogs |
| `--radius-xl` / `AppRadius.xl` | 24px | Large containers |
| `--radius-full` / `AppRadius.full` | 9999px | Pills, avatars |

## Elevation (Shadows)

| Token | Web | Flutter |
|-------|-----|---------|
| **Elevation 1** | `0px 1px 3px rgba(15,23,42,0.08)` | `AppShadows.elevation1` |
| **Elevation 2** | `0px 4px 8px rgba(15,23,42,0.10)` | `AppShadows.elevation2` |
| **Elevation 3** | `0px 20px 40px rgba(15,23,42,0.14)` | `AppShadows.elevation3` |

## Motion

| Token | Value |
|-------|-------|
| `--motion-duration-fast` | 120ms |
| `--motion-duration-normal` | 220ms |
| `--motion-duration-slow` | 350ms |
| `--motion-easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--motion-easing-decelerate` | `cubic-bezier(0.0, 0.0, 0.2, 1)` |
| `--motion-easing-accelerate` | `cubic-bezier(0.4, 0.0, 1, 1)` |

## File Locations

### Web Admin
- **Tokens:** `apps/admin_web/src/styles/tokens.css`
- **Tailwind Config:** `apps/admin_web/tailwind.config.js`
- **Base Styles:** `apps/admin_web/src/styles/base.css`
- **Components:** `apps/admin_web/src/styles/components.css`

### Mobile App
- **Colors:** `apps/mobile_app/lib/core/theme/app_colors.dart`
- **Text Styles:** `apps/mobile_app/lib/core/theme/app_text_styles.dart`
- **Spacing:** `apps/mobile_app/lib/core/theme/app_spacing.dart`
- **Radius:** `apps/mobile_app/lib/core/theme/app_radius.dart`
- **Shadows:** `apps/mobile_app/lib/core/theme/app_shadows.dart`
- **Theme:** `apps/mobile_app/lib/theme/app_theme.dart`

## Usage Examples

### Web (React + Tailwind)
```tsx
// Button with primary color
<button className="bg-primary hover:bg-primary-hover text-primary-on px-4 py-2 rounded-md">
  Submit
</button>

// Card with elevation
<div className="bg-surface shadow-level-2 rounded-lg p-4">
  <h2 className="text-heading-md text-text-primary">Title</h2>
  <p className="text-body-md text-text-secondary">Content</p>
</div>
```

### Flutter
```dart
// Button with primary color
ElevatedButton(
  style: ElevatedButton.styleFrom(
    backgroundColor: AppColors.primaryDefault,
    foregroundColor: AppColors.primaryOn,
    padding: EdgeInsets.symmetric(horizontal: AppSpacing.space4, vertical: AppSpacing.space2),
    shape: RoundedRectangleBorder(borderRadius: AppRadius.borderMd),
  ),
  onPressed: () {},
  child: Text('Submit'),
)

// Card with elevation
Card(
  elevation: AppShadows.elevation2,
  shape: RoundedRectangleBorder(borderRadius: AppRadius.borderLg),
  child: Padding(
    padding: EdgeInsets.all(AppSpacing.space4),
    child: Column(
      children: [
        Text('Title', style: AppTextStyles.headingMd),
        Text('Content', style: AppTextStyles.bodyMd.copyWith(color: AppColors.textSecondary)),
      ],
    ),
  ),
)
```

## Consistency Checklist

When adding new UI:

- [ ] Use semantic tokens (not hardcoded colors)
- [ ] Apply consistent spacing scale
- [ ] Use correct border radius from scale
- [ ] Match typography styles
- [ ] Apply proper elevation for hierarchy
- [ ] Test in both light and dark modes
- [ ] Ensure touch targets are ≥40px (mobile)
- [ ] Verify Bengali text renders correctly

## Updating Tokens

1. **Update CSS tokens** in `apps/admin_web/src/styles/tokens.css`
2. **Update Flutter colors** in `apps/mobile_app/lib/core/theme/app_colors.dart`
3. **Update this document** with new mappings
4. **Test both platforms** before committing
