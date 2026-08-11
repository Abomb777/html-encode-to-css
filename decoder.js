async function PagePreparing(key){
    function xorEncode(text,key) {
        let encoded = '';
        for (let i = 0; i < text.length; i++) {
            encoded += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)); // XOR each character
        }
    
        return encoded;
    }

    function generateRandomClass() {
        return 'random-class-' + Math.random().toString(36).slice(2, 9); // Generate a random class
    }
    
    function decodeBase64(str) {
        return btoa(unescape(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
            return String.fromCharCode('0x' + p1);
        })));
    }

    const allElementsx = document.querySelectorAll('*');

    // Filter to get only the elements that have text nodes as direct children
    const textNodeOnlyElements = Array.from(allElementsx).filter(el => {
    // Get all child nodes of the element
    const children = el.childNodes;
    
    // Check if all child nodes are text nodes
    return el.textContent && el.textContent.length>1 && !["STYLE","META","LINK"].includes(el.tagName) && Array.from(children).every(node => node.nodeType === Node.TEXT_NODE);
    });

    function tailCleaning(element) {
        if (element.nodeType === Node.ELEMENT_NODE) {
            const randomClass = generateRandomClass(); 
            const textContent = element.textContent.replace(/"/g, "'").trim();
            const xorEncodedText = xorEncode(textContent,key);
            const encodedText = decodeBase64(xorEncodedText);
            
            element.classList.add(randomClass); 
            element.textContent = ''; 

            // Add CSS with the decoded text for each element using its unique random class
            const style = document.createElement('style');
            style.textContent = `.${randomClass}::before { content: "${encodedText}";}`; 
            style.textContent += `.${randomClass}::after { content: "" }`;
            document.head.appendChild(style);
        }
    }

    // Log or do something with the result
    textNodeOnlyElements.forEach((element, i) => {
        try {
            tailCleaning(element);
        } catch (error) {
            console.error(`Error processing element [${i}]:`, error);
        }
    });

    // repeat the transformation DOM from the control
    document.querySelectorAll('*').forEach(el => {
        const children = el.childNodes;
        
        if (el && el.textContent && el.textContent.length > 1 && !["STYLE", "META", "LINK"].includes(el.tagName)) {
            Array.from(children).forEach(item => {
                if (item.nodeType === Node.TEXT_NODE && item.textContent.trim().length > 0) {
                    // Wrap the text node in a span
                    const span = document.createElement('span');
                    span.textContent = item.textContent;
                    el.replaceChild(span, item);

                    // repeat
                    tailCleaning(span); 
                }
            });
        }
    });

    // Clear all meta tag contents
    document.querySelectorAll('meta').forEach(meta => {
        const content = meta.getAttribute('content');
        if (content) {
            const xorEncodedContent = xorEncode(content,key);
            const encodedContent = decodeBase64(xorEncodedContent);
            meta.setAttribute('content', encodedContent);
        }
    });
    document.querySelectorAll('a').forEach(a => {
        const content = a.getAttribute('title');
        if (content) {
            const xorEncodedContent = xorEncode(content,key);
            const encodedContent = decodeBase64(xorEncodedContent);
            a.setAttribute('title', encodedContent);
        }
    });

    document.querySelectorAll('img').forEach(img => {
        const randomClass = generateRandomClass(); 
        const xorEncodedSrc = xorEncode(img.src, key);
        const encodedSrc = decodeBase64(xorEncodedSrc);
        img.classList.add(randomClass);
        img.src = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSiEndPkpxU-FDOQK0acJ6iuFECTI914xOelQ&s';

        const newStyle = document.createElement('style');
        newStyle.textContent = `
            .${randomClass}::before { 
                content: "${encodedSrc}"; 
                display: block;
                position: absolute;
                font-size: 0; 
            }
        `;
        document.head.appendChild(newStyle);
    })

    return ;
};

module.exports = {
    PagePreparing
};