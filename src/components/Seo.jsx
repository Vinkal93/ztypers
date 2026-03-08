import { Helmet } from 'react-helmet-async';

export default function Seo({
    title,
    description,
    keywords,
    canonicalUrl,
    ogImage = "https://ztypers.vercel.app/og-image.png",
    schema
}) {
    const defaultTitle = "Z Typers — India's Best Live Typing Platform | Built by Vinkal Prajapati";
    const defaultDescription = "India's most transparent live typing competition platform. Compete in real-time, track WPM, accuracy, and rank against others. Developed by Vinkal Prajapati for typing enthusiasts and institutes.";
    const defaultKeywords = "typing competition, typing test, WPM test, speed typing, Z Typers, live typing competition, online typing test, typing speed test, typing practice, typing game, India typing competition, Vinkal Prajapati, Vinkal Prajapati Typing, best typing platform India, ZTypers, Z-Typers";
    const baseSiteUrl = "https://ztypers.vercel.app";

    const finalTitle = title ? `${title} | Z Typers` : defaultTitle;
    const finalDescription = description || defaultDescription;
    const finalKeywords = keywords || defaultKeywords;
    const finalCanonical = canonicalUrl ? `${baseSiteUrl}${canonicalUrl}` : baseSiteUrl;

    return (
        <Helmet>
            <title>{finalTitle}</title>
            <meta name="description" content={finalDescription} />
            <meta name="keywords" content={finalKeywords} />
            <link rel="canonical" href={finalCanonical} />

            {/* Open Graph */}
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:url" content={finalCanonical} />
            <meta property="og:image" content={ogImage} />

            {/* Twitter */}
            <meta name="twitter:title" content={finalTitle} />
            <meta name="twitter:description" content={finalDescription} />
            <meta name="twitter:image" content={ogImage} />

            {/* Custom Schema Insertion */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
}
