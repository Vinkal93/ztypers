<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap - Z Typers</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; color: #333; margin: 0; padding: 40px; background-color: #f9fafb; }
          #header { background: #2563eb; color: white; padding: 20px 30px; border-radius: 8px 8px 0 0; }
          #header h1 { margin: 0; font-size: 24px; font-weight: 600; }
          #header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
          #content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; padding: 12px 15px; border-bottom: 2px solid #e5e7eb; color: #4b5563; font-weight: 600; }
          td { padding: 12px 15px; border-bottom: 1px solid #f3f4f6; }
          tr:hover { background-color: #f9fafb; }
          a { color: #2563eb; text-decoration: none; font-weight: 500; }
          a:hover { text-decoration: underline; }
          .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div id="header">
          <h1>Z Typers - XML Sitemap</h1>
          <p>This sitemap helps search engines like Google discover and index pages on the website. Developed by Vinkal Prajapati.</p>
        </div>
        <div id="content">
          <p>
            <strong>Total URLs:</strong> <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
          </p>
          <table>
            <thead>
              <tr>
                <th>Page URL</th>
                <th>Priority</th>
                <th>Change Frequency</th>
                <th>Last Modified</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a href="{sitemap:loc}">
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td><xsl:value-of select="sitemap:priority"/></td>
                  <td><xsl:value-of select="sitemap:changefreq"/></td>
                  <td><xsl:value-of select="sitemap:lastmod"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
          <div class="footer">
            &copy; 2026 Z Typers | Vinkal Prajapati
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
