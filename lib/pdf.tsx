import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import type { APISeries } from './series'
import type { Insight } from './insights'

// Register custom fonts if needed (optional)
// Font.register({ family: 'Inter', src: '...' })

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #3b82f6',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  section: {
    marginTop: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
    borderLeft: '4 solid #3b82f6',
    paddingLeft: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: '30%',
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'bold',
  },
  value: {
    width: '70%',
    fontSize: 10,
    color: '#1e293b',
  },
  insight: {
    backgroundColor: '#f1f5f9',
    padding: 10,
    marginBottom: 8,
    borderRadius: 4,
  },
  insightTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.4,
  },
  insightCategory: {
    fontSize: 8,
    color: '#3b82f6',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metric: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  metricName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
    borderTop: '1 solid #e2e8f0',
    paddingTop: 10,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  chart: {
    width: '100%',
    height: 200,
    marginTop: 10,
    marginBottom: 10,
  },
})

interface SchoolProfilePDFProps {
  school: {
    name: string
    unitid: number
    sector?: string
    level?: string
    division?: string
    conference?: string
    logo?: string
  }
  metrics?: APISeries[]
  insights?: Insight[]
  generatedAt?: string
}

export function SchoolProfilePDF({ school, metrics, insights, generatedAt }: SchoolProfilePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {school.logo && <Image src={school.logo} style={styles.logo} />}
          <Text style={styles.title}>{school.name}</Text>
          <Text style={styles.subtitle}>UNITID: {school.unitid}</Text>
        </View>

        {/* School Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Institution Details</Text>
          {school.sector && (
            <View style={styles.row}>
              <Text style={styles.label}>Sector</Text>
              <Text style={styles.value}>{school.sector}</Text>
            </View>
          )}
          {school.level && (
            <View style={styles.row}>
              <Text style={styles.label}>Level</Text>
              <Text style={styles.value}>{school.level}</Text>
            </View>
          )}
          {school.division && (
            <View style={styles.row}>
              <Text style={styles.label}>Division</Text>
              <Text style={styles.value}>{school.division}</Text>
            </View>
          )}
          {school.conference && (
            <View style={styles.row}>
              <Text style={styles.label}>Conference</Text>
              <Text style={styles.value}>{school.conference}</Text>
            </View>
          )}
        </View>

        {/* Key Metrics */}
        {metrics && metrics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            {metrics.slice(0, 6).map((metric, idx) => {
              const latestPoint = metric.points[metric.points.length - 1]
              return (
                <View key={idx} style={styles.metric}>
                  <Text style={styles.metricName}>{metric.label || metric.code}</Text>
                  <Text style={styles.metricValue}>
                    {latestPoint?.value?.toLocaleString() ?? 'N/A'} ({latestPoint?.year ?? ''})
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        {/* AI Insights */}
        {insights && insights.length > 0 && (
          <View style={styles.section} break>
            <Text style={styles.sectionTitle}>AI-Generated Insights</Text>
            {insights.slice(0, 5).map((insight, idx) => (
              <View key={idx} style={styles.insight}>
                <Text style={styles.insightCategory}>{insight.category}</Text>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {generatedAt || new Date().toLocaleDateString()} | IPEDS Analytics Platform
        </Text>
      </Page>
    </Document>
  )
}

interface ComparisonPDFProps {
  schools: Array<{
    name: string
    unitid: number
    logo?: string
  }>
  metrics?: APISeries[]
  generatedAt?: string
}

export function ComparisonPDF({ schools, metrics, generatedAt }: ComparisonPDFProps) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>School Comparison Report</Text>
          <Text style={styles.subtitle}>
            {schools.map((s) => s.name).join(' vs ')}
          </Text>
        </View>

        {/* Comparison Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metric Comparison</Text>
          {metrics?.slice(0, 10).map((metric, idx) => (
            <View key={idx} style={styles.metric}>
              <Text style={styles.metricName}>{metric.label || metric.code}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {schools.map((school, sidx) => {
                  const schoolMetric = metrics?.find((m) => m.unitid === school.unitid)
                  const latestPoint = schoolMetric?.points[schoolMetric.points.length - 1]
                  return (
                    <View key={sidx} style={{ flex: 1 }}>
                      <Text style={{ fontSize: 8, color: '#64748b' }}>{school.name}</Text>
                      <Text style={styles.metricValue}>
                        {latestPoint?.value?.toLocaleString() ?? 'N/A'}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Generated on {generatedAt || new Date().toLocaleDateString()} | IPEDS Analytics Platform
        </Text>
      </Page>
    </Document>
  )
}
