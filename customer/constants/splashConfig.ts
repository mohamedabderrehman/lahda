/**
 * شاشة البداية المستقلة — إعدادات سهلة التعديل.
 * Standalone splash: full-screen, then app.
 */

export const SPLASH_CONFIG = {
  minDisplayMs: 1300,
  maxTimeoutMs: 2800,
  fadeInMs: 520,
  fadeOutMs: 480,

  /** تأخير بين ظهور العناصر (مللي ثانية) */
  staggerMs: 140,
  /** تنفس العنصر المركزي: أقصى scale (1 = بدون، 1.04 = خفيف) */
  breathScaleMax: 1.04,
  breathDurationMs: 2000,

  appNameAr: 'لحظة',
  appNameEn: 'Lahda',
  taglineAr: 'اطلب .. نوصّل .. بلحظة',
  taglineEn: '',

  /** التدرج: أزرق غامق → أزرق → بنفسجي خفيف → فاتح (لمسة دافئة) */
  gradientColors: ['#FFF8F1', '#FFE2C7', '#FFB36B', '#FF6B1A', '#D94A00'] as [string, string, ...string[]],
  gradientStart: { x: 0.35, y: 0 } as { x: number; y: number },
  gradientEnd: { x: 0.65, y: 1 } as { x: number; y: number },

  bloomOpacity: 0.18,
  bloomScale: 2.4,

  /** خط فاصل بين العنوان والشعار (شفافية) */
  dividerColor: 'rgba(255,255,255,0.35)',
  /** موقع المحتوى عمودياً (0.48 = أعلى قليلاً من المنتصف) */
  contentOffsetPercent: 0.48,

  titleColor: '#FFFFFF',
  taglineColor: 'rgba(255,255,255,0.9)',
  accentColor: 'rgba(255,255,255,0.75)',

  /** دوائر خلفية شفافة (عمق) */
  concentricCircles: true,
  /** نقاط خفيفة في الخلفية */
  particlesCount: 24,
} as const;
