import { SingboxConfigBuilder } from './src/SingboxConfigBuilder.js';

// 测试用的代理链接
const testUrls = [
  'vmess://eyJhZGQiOiIxMjcuMC4wLjEiLCJhaWQiOiIwIiwiaG9zdCI6IiIsImlkIjoiMTIzNDU2NzgtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5YWJjIiwibmV0IjoidGNwIiwicGF0aCI6IiIsInBvcnQiOiIxMDAwIiwicHMiOiLkuK3lm73moLflvI8iLCJ0bHMiOiIiLCJ0eXBlIjoibm9uZSIsInYiOiIyIn0=',
  'ss://YWVzLTI1Ni1nY206dGVzdHBhc3N3b3JkQDEyNy4wLjAuMToxMDAw#5Li95Y-RIQ==',
  'vless://12345678-1234-1234-1234-123456789abc@127.0.0.1:1000?encryption=none&security=none#5Li95Y-RVmxlc3M'
];

async function testSingboxV11Compatibility() {
  console.log('测试 Singbox v1.11+ 兼容性 - Legacy Special Outbounds 修复验证\n');
  
  const inputString = testUrls.join('\n');
  const selectedRules = ['minimal'];
  
  const builder = new SingboxConfigBuilder(inputString, selectedRules, [], undefined, 'zh', 'Mozilla/5.0');
  const config = await builder.build();
  
  console.log('=== Singbox v1.11+ 兼容性检查 ===\n');
  
  let hasLegacyIssues = false;
  
  // 1. 检查 DNS 配置中的 detour 引用
  console.log('1. DNS 配置 detour 检查:');
  if (config.dns && config.dns.servers) {
    config.dns.servers.forEach((server, index) => {
      if (server.detour) {
        if (server.detour.includes('🚀') || server.detour.includes('⚡') || server.detour.includes('🐟')) {
          console.log(`  ❌ DNS服务器 ${server.tag} 使用了遗留的特殊outbound: ${server.detour}`);
          hasLegacyIssues = true;
        } else if (server.detour === 'proxy' || server.detour === 'DIRECT') {
          console.log(`  ✅ DNS服务器 ${server.tag} 使用了正确的outbound: ${server.detour}`);
        } else {
          console.log(`  ⚠️  DNS服务器 ${server.tag} 使用了未知的outbound: ${server.detour}`);
        }
      }
    });
  }
  
  // 2. 检查路由规则中的 outbound 引用
  console.log('\n2. 路由规则 outbound 检查:');
  if (config.route && config.route.rules) {
    config.route.rules.forEach((rule, index) => {
      if (rule.outbound) {
        if (rule.outbound.includes('🚀') || rule.outbound.includes('⚡') || rule.outbound.includes('🐟')) {
          console.log(`  ❌ 路由规则 ${index + 1} 使用了遗留的特殊outbound: ${rule.outbound}`);
          hasLegacyIssues = true;
        } else {
          console.log(`  ✅ 路由规则 ${index + 1} 使用了正确的outbound: ${rule.outbound}`);
        }
      }
    });
  }
  
  // 3. 检查 clash_mode 规则
  console.log('\n3. Clash Mode 规则检查:');
  if (config.route && config.route.rules) {
    const clashModeRules = config.route.rules.filter(rule => rule.clash_mode);
    clashModeRules.forEach((rule, index) => {
      if (rule.clash_mode === 'global') {
        if (rule.outbound === 'proxy') {
          console.log(`  ✅ Clash Mode: global 使用了新的proxy格式`);
        } else {
          console.log(`  ❌ Clash Mode: global 使用了错误的outbound: ${rule.outbound}`);
          hasLegacyIssues = true;
        }
      }
    });
  }
  
  // 4. 检查 proxy outbound 是否存在且正确配置
  console.log('\n4. Proxy Outbound 配置检查:');
  const proxyOutbound = config.outbounds.find(outbound => outbound.tag === 'proxy');
  if (proxyOutbound) {
    console.log(`  ✅ 存在 proxy outbound (类型: ${proxyOutbound.type})`);
    if (proxyOutbound.outbounds) {
      const hasSpecialOutbounds = proxyOutbound.outbounds.some(opt => 
        opt.includes('🚀') || opt.includes('⚡') || opt.includes('🐟')
      );
      if (hasSpecialOutbounds) {
        console.log(`  ❌ proxy outbound 包含特殊字符的选项`);
        console.log(`     问题选项: ${proxyOutbound.outbounds.filter(opt => opt.includes('🚀') || opt.includes('⚡') || opt.includes('🐟'))}`);
        hasLegacyIssues = true;
      } else {
        console.log(`  ✅ proxy outbound 不包含特殊字符的选项`);
      }
    }
  } else {
    console.log(`  ❌ 缺失 proxy outbound`);
    hasLegacyIssues = true;
  }
  
  // 5. 检查是否仍有其他地方引用了旧的 outbound 名称
  console.log('\n5. 旧格式引用检查:');
  const allOutboundReferences = [];
  
  // 收集所有 outbound 引用
  if (config.dns && config.dns.servers) {
    config.dns.servers.forEach(server => {
      if (server.detour) allOutboundReferences.push(server.detour);
    });
  }
  
  if (config.route && config.route.rules) {
    config.route.rules.forEach(rule => {
      if (rule.outbound) allOutboundReferences.push(rule.outbound);
    });
  }
  
  if (config.outbounds) {
    config.outbounds.forEach(outbound => {
      if (outbound.outbounds) {
        allOutboundReferences.push(...outbound.outbounds);
      }
    });
  }
  
  const legacyReferences = allOutboundReferences.filter(ref => 
    ref.includes('🚀 节点选择') || ref === '🚀 节点选择'
  );
  
  if (legacyReferences.length > 0) {
    console.log(`  ❌ 发现 ${legacyReferences.length} 个遗留的特殊outbound引用:`);
    legacyReferences.forEach(ref => console.log(`     - ${ref}`));
    hasLegacyIssues = true;
  } else {
    console.log(`  ✅ 未发现遗留的特殊outbound引用`);
  }
  
  // 6. 最终结果
  console.log('\n=== 检查结果 ===');
  if (hasLegacyIssues) {
    console.log('❌ 仍有遗留的特殊outbound问题，可能会产生弃用警告');
  } else {
    console.log('✅ 所有检查通过，应该不会产生 legacy special outbounds 警告');
  }
  
  console.log('\n=== 生成的配置摘要 ===');
  console.log(`总 Outbound 数量: ${config.outbounds.length}`);
  console.log(`代理节点数量: ${config.outbounds.filter(o => o.server).length}`);
  console.log(`选择器组数量: ${config.outbounds.filter(o => o.type === 'selector').length}`);
  console.log(`路由规则数量: ${config.route.rules.length}`);
  
  return !hasLegacyIssues;
}

testSingboxV11Compatibility().then(isCompatible => {
  console.log(`\n兼容性测试结果: ${isCompatible ? '通过' : '失败'}`);
  process.exit(isCompatible ? 0 : 1);
}).catch(console.error);