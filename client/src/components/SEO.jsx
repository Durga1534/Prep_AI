import { Helmet } from "react-helmet-async";

const SEO = ({title, description, keywords = [], canonical}) => {
    const siteName = 'PrepAI';
    const fullTitle = `${title} | ${siteName}`;

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords.join(', ')} />

            {canonical && <link rel="canonical" href={canonical} />}

            {/* Open Graph tags */}
            <meta property="og:site_name" content={siteName} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:type" content="website" />
            <meta property="og:locale" content="en_US" />

            {/* Additional meta tags */}
            <meta name="robots" content="index, follow" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        </Helmet>
    )
};

export default SEO;