import { SingboxConfigBuilder } from './src/SingboxConfigBuilder.js';
import { SING_BOX_CONFIG } from './src/config.js';

// 测试用的代理链接
const testUrls = [
    'vmess://eyJhZGQiOiIxMjcuMC4wLjEiLCJhaWQiOiIwIiwiaG9zdCI6IiIsImlkIjoiMTIzNDU2NzgtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5YWJjIiwibmV0IjoidGNwIiwicGF0aCI6IiIsInBvcnQiOiIxMDAwIiwicHMiOiLkuK3lm73moLflvI8iLCJ0bHMiOiIiLCJ0eXBlIjoibm9uZSIsInYiOiIyIn0=',
    'ss://YWVzLTI1Ni1nY206dGVzdHBhc3N3b3JkQDEyNy4wLjAuMToxMDAw#5Li95Y-RIQ==',
    'vless://12345678-1234-1234-1234-123456789abc@127.0.0.1:1000?encryption=none&security=none#5Li95Y-RVmxlc3M'
];

async function testCompleteSingboxConfig() {
    console.log('=== 完整的Singbox配置测试 ===\n');
    
    const inputString = testUrls.join('\n');
    const selectedRules = ['minimal'];
    
    // 1. 检查基础配置
    console.log('1. 检查基础配置:');
    console.log('DNS detour:', SING_BOX_CONFIG.dns?.servers[0]?.detour);
    console.log('Outbounds:', SING_BOX_CONFIG.outbounds.map(o => ({ type: o.type, tag: o.tag })));
    console.log('');
    
    // 2. 创建配置构建器并生成完整配置
    const builder = new SingboxConfigBuilder(inputString, selectedRules, [], undefined, 'zh', 'Mozilla/5.0');
    const config = await builder.build();
    
    // 3. 检查生成的完整配置
    console.log('2. 检查生成的完整配置:');
    console.log('DNS detour:', config.dns?.servers[0]?.detour);
    console.log('DNS servers:', config.dns?.servers.map(s => ({ tag: s.tag, detour: s.detour })));
    console.log('');
    
    // 4. 检查所有 outbounds
    console.log('3. 检查所有 outbounds:');
    config.outbounds.forEach(outbound => {
        console.log(`- ${outbound.tag}: type=${outbound.type}, server=${outbound.server || 'N/A'}`);
    });
    console.log('');
    
    // 5. 检查路由规则
    console.log('4. 检查路由规则:');
    config.route.rules.slice(0, 10).forEach((rule, index) => {
        if (rule.clash_mode) {
            console.log(`- Rule ${index}: clash_mode=${rule.clash_mode}, outbound=${rule.outbound}`);
        }
    });
    console.log('');
    
    // 6. 检查是否有潜在的弃用配置
    console.log('5. 检查潜在的弃用配置:');
    const problematicOutbounds = config.outbounds.filter(o => 
        o.tag && (o.tag.includes('🚀') || o.tag.includes('节点') || o.tag.includes('选择'))
    );
    if (problematicOutbounds.length > 0) {
        console.log('发现可能的问题 outbounds:', problematicOutbounds.map(o => o.tag));
    } else {
        console.log('✓ 没有发现明显的问题 outbounds');
    }
    
    // 7. 检查 DNS 配置中的问题
    const dnsIssues = config.dns?.servers.filter(s => 
        s.detour && (s.detour.includes('🚀') || s.detour.includes('节点') || s.detour.includes('选择'))
    );
    if (dnsIssues && dnsIssues.length > 0) {
        console.log('发现 DNS 配置问题:', dnsIssues.map(s => ({ tag: s.tag, detour: s.detour })));
    } else {
        console.log('✓ DNS 配置看起来正常');
    }
    
    // 8. 输出完整配置用于调试
    console.log('\n6. 完整配置 (用于调试):');
    console.log(JSON.stringify(config, null, 2));
}

testCompleteSingboxConfig().catch(console.error);