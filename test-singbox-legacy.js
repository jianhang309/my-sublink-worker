import { SingboxConfigBuilder } from './src/SingboxConfigBuilder.js';

// 测试用的代理链接
const testUrls = [
  'vmess://eyJhZGQiOiIxMjcuMC4wLjEiLCJhaWQiOiIwIiwiaG9zdCI6IiIsImlkIjoiMTIzNDU2NzgtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5YWJjIiwibmV0IjoidGNwIiwicGF0aCI6IiIsInBvcnQiOiIxMDAwIiwicHMiOiLkuK3lm73moLflvI8iLCJ0bHMiOiIiLCJ0eXBlIjoibm9uZSIsInYiOiIyIn0=',
  'ss://YWVzLTI1Ni1nY206dGVzdHBhc3N3b3JkQDEyNy4wLjAuMToxMDAw#5Li95Y-RIQ==',
  'vless://12345678-1234-1234-1234-123456789abc@127.0.0.1:1000?encryption=none&security=none#5Li95Y-RVmxlc3M'
];

async function testSingboxConfiguration() {
  console.log('深度测试singbox配置中的legacy special outbounds问题...\n');
  
  const inputString = testUrls.join('\n');
  const selectedRules = ['minimal'];
  
  const builder = new SingboxConfigBuilder(inputString, selectedRules, [], undefined, 'zh', 'Mozilla/5.0');
  const config = await builder.build();
  
  console.log('=== 完整配置分析 ===\n');
  
  // 1. 检查 DNS 配置
  console.log('1. DNS 配置检查:');
  if (config.dns && config.dns.servers) {
    config.dns.servers.forEach((server, index) => {
      console.log(`  DNS服务器 ${index + 1}: ${server.tag}`);
      console.log(`    地址: ${server.address}`);
      console.log(`    Detour: ${server.detour || '无'}`);
      
      // 检查是否使用了旧的 outbound 名称
      if (server.detour && server.detour.includes('🚀')) {
        console.log(`    ❌ 发现遗留的特殊outbound: ${server.detour}`);
      } else if (server.detour === 'proxy') {
        console.log(`    ✅ 使用了新的proxy格式`);
      }
    });
  }
  
  // 2. 检查 Outbounds 配置
  console.log('\n2. Outbounds 配置检查:');
  config.outbounds.forEach((outbound, index) => {
    console.log(`  Outbound ${index + 1}: ${outbound.tag} (${outbound.type})`);
    
    // 检查是否有包含特殊字符的 tag
    if (outbound.tag && outbound.tag.includes('🚀')) {
      console.log(`    ❌ 发现遗留的特殊outbound: ${outbound.tag}`);
    }
    
    // 检查 selector 类型的 outbounds
    if (outbound.type === 'selector' && outbound.outbounds) {
      console.log(`    选择器选项: ${outbound.outbounds.join(', ')}`);
      
      // 检查是否有包含特殊字符的选项
      const specialOutbounds = outbound.outbounds.filter(opt => opt.includes('🚀'));
      if (specialOutbounds.length > 0) {
        console.log(`    ❌ 选择器中包含遗留的特殊outbound: ${specialOutbounds.join(', ')}`);
      }
    }
  });
  
  // 3. 检查路由规则
  console.log('\n3. 路由规则检查:');
  if (config.route && config.route.rules) {
    config.route.rules.forEach((rule, index) => {
      console.log(`  规则 ${index + 1}: ${rule.clash_mode || rule.protocol || 'general'} -> ${rule.outbound || rule.action}`);
      
      // 检查是否使用了旧的 outbound 名称
      if (rule.outbound && rule.outbound.includes('🚀')) {
        console.log(`    ❌ 发现遗留的特殊outbound: ${rule.outbound}`);
      }
      
      // 检查 clash_mode 规则
      if (rule.clash_mode === 'global' && rule.outbound === 'proxy') {
        console.log(`    ✅ clash_mode: global 使用了新的proxy格式`);
      }
    });
  }
  
  // 4. 检查是否有重复或缺失的 proxy outbound
  console.log('\n4. Proxy Outbound 检查:');
  const proxyOutbounds = config.outbounds.filter(outbound => outbound.tag === 'proxy');
  if (proxyOutbounds.length === 0) {
    console.log('  ❌ 缺失 proxy outbound');
  } else if (proxyOutbounds.length > 1) {
    console.log('  ❌ 存在多个 proxy outbound');
  } else {
    console.log('  ✅ 存在唯一的 proxy outbound');
    const proxyOutbound = proxyOutbounds[0];
    if (proxyOutbound.type === 'selector' && proxyOutbound.outbounds) {
      console.log(`    类型: ${proxyOutbound.type}`);
      console.log(`    选项: ${proxyOutbound.outbounds.join(', ')}`);
    }
  }
  
  // 5. 检查配置完整性
  console.log('\n5. 配置完整性检查:');
  const requiredOutbounds = ['DIRECT', 'REJECT', 'proxy'];
  const existingOutbounds = config.outbounds.map(outbound => outbound.tag);
  
  requiredOutbounds.forEach(required => {
    if (existingOutbounds.includes(required)) {
      console.log(`  ✅ 存在必需的 outbound: ${required}`);
    } else {
      console.log(`  ❌ 缺失必需的 outbound: ${required}`);
    }
  });
  
  // 6. 检查是否有其他可能的遗留问题
  console.log('\n6. 其他潜在问题检查:');
  
  // 检查是否还有中文 outbound 名称
  const chineseOutbounds = existingOutbounds.filter(tag => /[\u4e00-\u9fff]/.test(tag));
  if (chineseOutbounds.length > 0) {
    console.log(`  ⚠️  发现中文 outbound 名称: ${chineseOutbounds.join(', ')}`);
  }
  
  // 检查是否有特殊字符
  const specialCharOutbounds = existingOutbounds.filter(tag => /[🚀⚡🐟🛑💬📺🔍🏠🔒📲🐱Ⓜ️🍏🌐🎬🎮📚💰☁️]/.test(tag));
  if (specialCharOutbounds.length > 0) {
    console.log(`  ⚠️  发现特殊字符 outbound 名称: ${specialCharOutbounds.join(', ')}`);
  }
  
  console.log('\n=== 检查完成 ===');
}

testSingboxConfiguration().catch(console.error);