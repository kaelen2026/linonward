import {
  type Context,
  propagation,
  ROOT_CONTEXT,
  type Span,
  SpanKind,
  trace,
} from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor, NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim().replace(/\/+$/, "");
const exporter = endpoint ? new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }) : undefined;
const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({ "service.name": "linonward-api" }),
  spanProcessors: exporter ? [new BatchSpanProcessor(exporter)] : [],
});
provider.register();

const tracer = trace.getTracer("@linonward/api");

export type TraceContext = {
  traceId: string;
  spanId: string;
  traceFlags: string;
  traceparent: string;
};

export type ServerTrace = { context: Context; span: Span; correlation: TraceContext };

/** Starts a server span, continuing a valid incoming W3C trace when present. */
export function startServerTrace(incoming: string | undefined, name: string): ServerTrace {
  const parent = propagation.extract(ROOT_CONTEXT, { traceparent: incoming });
  const span = tracer.startSpan(name, { kind: SpanKind.SERVER }, parent);
  const spanContext = span.spanContext();
  const traceFlags = spanContext.traceFlags.toString(16).padStart(2, "0");
  return {
    context: trace.setSpan(parent, span),
    span,
    correlation: {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      traceFlags,
      traceparent: `00-${spanContext.traceId}-${spanContext.spanId}-${traceFlags}`,
    },
  };
}

export function shutdownTelemetry(): Promise<void> {
  return provider.shutdown();
}
