import { SING_BOX_CONFIG, generateRuleSets, generateRules, getOutbounds, PREDEFINED_RULE_SETS} from './config.js';
import { BaseConfigBuilder } from './BaseConfigBuilder.js';
import { DeepCopy } from './utils.js';
import { t } from './i18n/index.js';

export class SingboxConfigBuilder extends BaseConfigBuilder {
    constructor(inputString, selectedRules, customRules, baseConfig, lang, userAgent) {
        if (baseConfig === undefined) {
            baseConfig = SING_BOX_CONFIG;
            if (baseConfig.dns && baseConfig.dns.servers) {
                baseConfig.dns.servers[0].detour = t('outboundNames.Node Select');
            }
        }
        super(inputString, baseConfig, lang, userAgent);
        this.selectedRules = selectedRules;
        this.customRules = customRules;
    }

    getProxies() {
        return this.config.outbounds.filter(outbound => outbound?.server != undefined);
    }

    getProxyName(proxy) {
        return proxy.tag;
    }

    convertProxy(proxy) {
        return proxy;
    }

    addProxyToConfig(proxy) {
        // Check if there are proxies with similar tags in existing outbounds
        const similarProxies = this.config.outbounds.filter(p => p.tag && p.tag.includes(proxy.tag));

        // Check if there is a proxy with identical data (excluding the tag)
        const isIdentical = similarProxies.some(p => {
            const { tag: _, ...restOfProxy } = proxy; // Exclude the tag attribute
            const { tag: __, ...restOfP } = p;       // Exclude the tag attribute
            return JSON.stringify(restOfProxy) === JSON.stringify(restOfP);
        });

        if (isIdentical) {
            // If there is a proxy with identical data, skip adding it
            return;
        }

        // If there are proxies with similar tags but different data, modify the tag name
        if (similarProxies.length > 0) {
            proxy.tag = `${proxy.tag} ${similarProxies.length + 1}`;
        }

        this.config.outbounds.push(proxy);
    }

    addAutoSelectGroup(proxyList) {
        // 如果proxyList为空，添加一个占位符防止空数组
        const validProxyList = proxyList.length > 0 ? proxyList : ['DIRECT'];
        this.config.outbounds.unshift({
            type: "urltest",
            tag: t('outboundNames.Auto Select'),
            outbounds: DeepCopy(validProxyList),
        });
    }

    addNodeSelectGroup(proxyList) {
        // 如果proxyList为空，只添加基础选项
        const validProxyList = proxyList.length > 0 
            ? ['DIRECT', 'REJECT', t('outboundNames.Auto Select'), ...proxyList]
            : ['DIRECT', 'REJECT'];
        this.config.outbounds.unshift({
            type: "selector",
            tag: t('outboundNames.Node Select'),
            outbounds: validProxyList
        });
    }

    addOutboundGroups(outbounds, proxyList) {
        outbounds.forEach(outbound => {
            if (outbound !== t('outboundNames.Node Select')) {
                const validProxyList = proxyList.length > 0 ? proxyList : [];
                const baseOutbounds = validProxyList.length > 0 
                    ? [t('outboundNames.Node Select'), ...validProxyList]
                    : ['DIRECT', 'REJECT'];
                this.config.outbounds.push({
                    type: "selector",
                    tag: t(`outboundNames.${outbound}`),
                    outbounds: baseOutbounds
                });
            }
        });
    }

    addCustomRuleGroups(proxyList) {
        if (Array.isArray(this.customRules)) {
            this.customRules.forEach(rule => {
                const validProxyList = proxyList.length > 0 ? proxyList : [];
                const baseOutbounds = validProxyList.length > 0 
                    ? [t('outboundNames.Node Select'), ...validProxyList]
                    : ['DIRECT', 'REJECT'];
                this.config.outbounds.push({
                    type: "selector",
                    tag: rule.name,
                    outbounds: baseOutbounds
                });
            });
        }
    }

    addFallBackGroup(proxyList) {
        const validProxyList = proxyList.length > 0 ? proxyList : [];
        const baseOutbounds = validProxyList.length > 0 
            ? [t('outboundNames.Node Select'), ...validProxyList]
            : ['DIRECT', 'REJECT'];
        this.config.outbounds.push({
            type: "selector",
            tag: t('outboundNames.Fall Back'),
            outbounds: baseOutbounds
        });
    }

    formatConfig() {
        const rules = generateRules(this.selectedRules, this.customRules);
        const { site_rule_sets, ip_rule_sets } = generateRuleSets(this.selectedRules,this.customRules);

        this.config.route.rule_set = [...site_rule_sets, ...ip_rule_sets];

        rules.filter(rule => !!rule.domain_suffix || !!rule.domain_keyword).map(rule => {
            this.config.route.rules.push({
                domain_suffix: rule.domain_suffix,
                domain_keyword: rule.domain_keyword,
                protocol: rule.protocol,
                outbound: t(`outboundNames.${rule.outbound}`)
            });
        });

        rules.filter(rule => !!rule.site_rules[0]).map(rule => {
            this.config.route.rules.push({
                rule_set: [
                ...(rule.site_rules.length > 0 && rule.site_rules[0] !== '' ? rule.site_rules : []),
                ],
                protocol: rule.protocol,
                outbound: t(`outboundNames.${rule.outbound}`)
            });
        });

        rules.filter(rule => !!rule.ip_rules[0]).map(rule => {
            this.config.route.rules.push({
                rule_set: [
                ...(rule.ip_rules.filter(ip => ip.trim() !== '').map(ip => `${ip}-ip`))
                ],
                protocol: rule.protocol,
                outbound: t(`outboundNames.${rule.outbound}`)
          });
        });

        rules.filter(rule => !!rule.ip_cidr).map(rule => {
            this.config.route.rules.push({
                ip_cidr: rule.ip_cidr,
                protocol: rule.protocol,
                outbound: t(`outboundNames.${rule.outbound}`)
            });
        });

        this.config.route.rules.unshift(
            { clash_mode: 'direct', outbound: 'DIRECT' },
            { clash_mode: 'global', outbound: t('outboundNames.Node Select') },
            { action: 'sniff' },
            { protocol: 'dns', action: 'hijack-dns' }
        );

        this.config.route.auto_detect_interface = true;
        this.config.route.final = t('outboundNames.Fall Back');

        return this.config;
    }
}