const fs = require('fs');
const jsdom = require("jsdom");
const { PagePreparing }  = require('./decoder');
const express = require('express');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express()
const port = 3000
const { JSDOM } = jsdom;


app.use(express.static(path.join(__dirname, 'static')));
app.use(bodyParser.text({ type: 'text/html' }));

app.get('/', async (req, res) => {
	let encoded = await convert(null, "true", "xorEncodeSecretKey");
    
	res.send(encoded);
});

app.get('/process', async (req, res) => {
    const match = req.query.url.match(/^https?:\/\/([^\/]+)/);
    const domain = match ? match[0] : null;
	console.log("domain: "+domain);
    const baseUrl = req.query.url.split('/').slice(0, -1).join('/');
    

	htmlBody = await new Promise(resolve=>{
		axios.get(req.query.url)
		.then(resp=>resolve(resp.data))
		.catch(error => {
			console.error('Error:', error.message);
		});
	});

    if (!htmlBody) {
        return res.status(400).send('No HTML body received');
    }

	try {
		let processedHtml = await convert(htmlBody, req.query.decode, req.query.key);
		processedHtml = processedHtml.replace(
            /<img\s+[^>]*src="([^"]+)"/g,
            (match, href) => match.replace(href, (href[0] == "/" ? domain : baseUrl+'/') + `${href}`)
        );
		processedHtml = processedHtml.replace(
            /<script\s+[^>]*src="([^"]+)"/g,
            (match, href) => match.replace(href, (href[0] == "/" ? domain : baseUrl+'/') + `${href}`)
        );
		processedHtml = processedHtml.replace(
            /<link\s+[^>]*href="([^"]+)"/g,
            (match, href) => match.replace(href, (href[0] == "/" ? domain : baseUrl+'/') + `${href}`)
        );
/*
        processedHtml = processedHtml.replace(
            /<link\s+[^>]*href="((?!https?:\/\/)[^"]+)"/g,
            (match, href) => match.replace(href, (href[0] == "/" ? domain : baseUrl+'/') + `${href}`)
        );
*/
        res.send(processedHtml);
		res.end();
    } catch (err) {
        console.error('Error processing HTML:', err);
        res.status(500).send('Internal server error');
    }
});

app.post('/process', async (req, res) => {
    const htmlBody = req.body; 

    if (!htmlBody) {
        return res.status(400).send('No HTML body received');
    }

	try {
        const processedHtml = await convert(htmlBody);
        res.send(processedHtml);
    } catch (err) {
        console.error('Error processing HTML:', err);
        res.status(500).send('Internal server error');
    }
});

async function convert(htmlBody, decode, xorEncodeSecretKey) {
	const data = htmlBody || fs.readFileSync('./test.html', 'utf8');
	const dom = new JSDOM(data, {
		runScripts: "outside-only",
		resources: "usable",
	});
	let theStrEval = `(${PagePreparing.toString()})("${xorEncodeSecretKey}")`;
	
	await dom.window.eval(theStrEval);

	if(decode !== 'false'){
		// Inject the <script> tag for decoder.js
		const scriptTag = dom.window.document.createElement('script');
		// scriptTag.src = 'encoder.js';
		scriptTag.defer = true;
		scriptTag.textContent = `
        (() => {
            const key = "${xorEncodeSecretKey}";

            // XOR encoding/decoding function
            function xorEncode(text, key) {
                let encoded = '';
                for (let i = 0; i < text.length; i++) {
                    encoded += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)); // XOR each character
                }
                return encoded;
            }

            var markers = [...document.querySelectorAll('[class*=random-class]')];

            function decodeBase64(str) {
                try {
                    const decoded = atob(str); 
                    const bytes = new Uint8Array(decoded.length);
                    
                    for (let i = 0; i < decoded.length; i++) {
                        bytes[i] = decoded.charCodeAt(i);
                    }
            
                    const decoder = new TextDecoder('utf-8'); 
                    return decoder.decode(bytes);
                } catch (e) {
                    return ""; 
                }
            };

            for (var i = 0; i < markers.length; i++) { 
                const style = window.getComputedStyle(markers[i], '::before');
                var encodedText = style.getPropertyValue('content').replace(/['"]/g, '').trim(); 
                const base64DecodedText = decodeBase64(encodedText);
                const decodedText = xorEncode(base64DecodedText, key);
            
                if (markers[i].tagName.toLowerCase() === 'img') {
                    markers[i].src = decodedText; 
                } else {
                    if (markers[i].className && typeof markers[i].className === 'string') {
                        const randomClass = markers[i].className.split(' ').find(cls => cls.startsWith('random-class-'));
                        if (randomClass) {
                            // Add CSS with the decoded text for non-img elements using their unique random class
                            const newStyle = document.createElement('style');
                            newStyle.textContent = \`
                                .\${markers[i].className.split(' ').find(cls => cls.startsWith('random-class-'))}::before { 
                                    content: "\${decodedText.replaceAll(/[\\n|\\r]/g, ' ')}"; 
                                }\`;
                            document.head.appendChild(newStyle);
                        }
                    }
                } 
            }

            document.querySelectorAll('meta').forEach(meta => {
                const encodedContent = meta.getAttribute('content');
                if (encodedContent) {
                    try {
                        const base64Decoded = decodeBase64(encodedContent);
                        const originalContent = xorEncode(base64Decoded, key);
                        meta.setAttribute('content', originalContent); 
                    } catch (e) {
                        console.error('Ошибка декодирования атрибута content:', e);
                    }
                }
            });

            document.querySelectorAll('a').forEach(a => {
                const encodedContent = a.getAttribute('title');
                if (encodedContent) {
                    try {
                        const base64Decoded = decodeBase64(encodedContent);
                        const originalContent = xorEncode(base64Decoded, key);
                        a.setAttribute('content', originalContent); 
                    } catch (e) {
                        console.error('Ошибка декодирования атрибута a[title]:', e);
                    }
                }
            });
        })();`
		dom.window.document.body.appendChild(scriptTag);
	}

	return dom.serialize();
}

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})