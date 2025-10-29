// 测试 OpenRouter API - 不设置 max_tokens
const fetch = require('node:https').request;

const testOpenRouter = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('测试 OpenRouter API');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Provider: google-vertex');
    console.log('Model: deepseek/deepseek-r1-0528');
    console.log('Max Tokens: 未设置');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const requestBody = JSON.stringify({
        model: 'deepseek/deepseek-r1-0528',
        messages: [
            {
                role: 'user',
                content: '请用一句话介绍你自己。'
            }
        ],
        // 不设置 max_tokens
        temperature: 1.0,
        provider: {
            order: ['Google/Vertex']  // 强制使用 Google/Vertex（注意大小写）
        }
    });

    const options = {
        hostname: 'openrouter.ai',
        port: 443,
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer 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',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
            'HTTP-Referer': 'https://prompt-tester.app',
            'X-Title': 'Prompty Test Script'
        }
    };

    return new Promise((resolve, reject) => {
        const req = fetch(options, (res) => {
            let data = '';

            console.log(`状态码: ${res.statusCode}`);
            console.log('响应头:');
            console.log(JSON.stringify(res.headers, null, 2));
            console.log('\n响应体:');

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(JSON.stringify(json, null, 2));

                    if (res.statusCode !== 200) {
                        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log('❌ 请求失败');
                        if (json.error) {
                            console.log('错误信息:', json.error.message);
                            console.log('错误代码:', json.error.code);
                            if (json.error.metadata) {
                                console.log('错误元数据:', JSON.stringify(json.error.metadata, null, 2));
                            }
                        }
                    } else {
                        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log('✅ 请求成功');
                        if (json.choices && json.choices[0]) {
                            console.log('响应内容:', json.choices[0].message.content);
                        }
                        if (json.usage) {
                            console.log('Token 使用:', json.usage);
                        }
                    }
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    resolve(json);
                } catch (e) {
                    console.log('原始响应:', data);
                    reject(e);
                }
            });
        });

        req.on('error', (error) => {
            console.error('请求错误:', error);
            reject(error);
        });

        req.write(requestBody);
        req.end();
    });
};

testOpenRouter().catch(console.error);
