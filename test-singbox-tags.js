import { SingboxConfigBuilder } from './src/SingboxConfigBuilder.js';

// 测试用的代理链接
const testUrls = [
  'vmess://eyJhZGQiOiIxMjcuMC4wLjEiLCJhaWQiOiIwIiwiaG9zdCI6IiIsImlkIjoiMTIzNDU2NzgtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5YWJjIiwibmV0IjoidGNwIiwicGF0aCI6IiIsInBvcnQiOiIxMDAwIiwicHMiOiLkuK3lm73moLflvI8iLCJ0bHMiOiIiLCJ0eXBlIjoibm9uZSIsInYiOiIyIn0=',
  'ss://YWVzLTI1Ni1nY206dGVzdHBhc3N3b3JkQDEyNy4wLjAuMToxMDAw#5Li95Y-RIQ==',
  'vless://12345678-1234-1234-1234-123456789abc@127.0.0.1:1000?encryption=none&security=none#5Li95Y-RVmxlc3M'
];

async function testSingboxTags() {
  console.log('测试singbox配置中的tags问题...\n');
  
  const inputString = testUrls.join('\n');
  const selectedRules = ['minimal'];
  
  const builder = new SingboxConfigBuilder(inputString, selectedRules, [], undefined, 'zh', 'Mozilla/5.0');
  const config = await builder.build();
  
  console.log('生成的代理节点tags:');
  const proxies = config.outbounds.filter(outbound => outbound?.server != undefined);
  proxies.forEach(proxy => {
    console.log(`- ${proxy.tag} (${proxy.type})`);
  });
  
  console.log('\n检查是否有missing tags...');
  const missingTags = proxies.filter(proxy => !proxy.tag || proxy.tag.trim() === '');
  if (missingTags.length > 0) {
    console.log('发现missing tags:', missingTags);
  } else {
    console.log('所有代理都有有效的tags');
  }
  
  console.log('\n检查是否有重复的tags...');
  const tags = proxies.map(proxy => proxy.tag);
  const uniqueTags = new Set(tags);
  if (tags.length !== uniqueTags.size) {
    console.log('发现重复tags');
    const duplicates = tags.filter((tag, index) => tags.indexOf(tag) !== index);
    console.log('重复tags:', duplicates);
  }
}

testSingboxTags().catch(console.error);