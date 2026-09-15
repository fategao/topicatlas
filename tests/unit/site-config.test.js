// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildSiteArtifacts, normalizeConfig } from '../../scripts/site-config.mjs'

const routes = ['/', '/hermes']

describe('站点域名配置', () => {
  it('去掉协议、路径与多余空白，只保留裸域名', () => {
    expect(normalizeConfig({ domain: '  https://TopicAtlas.DEV/  ' }).domain).toBe('topicatlas.dev')
    expect(normalizeConfig({ domain: 'topicatlas.dev/' }).domain).toBe('topicatlas.dev')
  })

  it('针对不同域名生成对应的 CNAME、robots 与 sitemap', () => {
    const artifacts = buildSiteArtifacts({ domain: 'example.com' }, routes)
    expect(artifacts.cname).toBe('example.com\n')
    expect(artifacts.robots).toContain('Sitemap: https://example.com/sitemap.xml')
    expect(artifacts.sitemap).toContain('<loc>https://example.com/</loc>')
    expect(artifacts.sitemap).toContain('<loc>https://example.com/hermes</loc>')
  })

  it('sitemap 里不会出现双斜杠，根路径也只出现一次', () => {
    const artifacts = buildSiteArtifacts({ domain: 'topicatlas.dev' }, routes)
    expect(artifacts.sitemap).not.toContain('topicatlas.dev//')
    expect(artifacts.sitemap.match(/topicatlas\.dev\/</g)?.length).toBe(1)
  })

  it('index.html 注入的占位符能定位到规范链接与 og:url', () => {
    const artifacts = buildSiteArtifacts({ domain: 'example.com' }, routes)
    expect(artifacts.siteUrl).toBe('https://example.com')
    expect(artifacts.replacements['%%SITE_URL%%']).toBe('https://example.com')
    expect(artifacts.replacements['%%SITE_DOMAIN%%']).toBe('example.com')
  })

  it('域名不合法时直接报错，避免把坏域名发布出去', () => {
    expect(() => normalizeConfig({ domain: 'not a domain' })).toThrow()
    expect(() => normalizeConfig({ domain: '' })).toThrow()
  })
})
