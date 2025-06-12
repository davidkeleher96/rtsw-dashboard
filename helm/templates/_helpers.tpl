{{- define "redis.name" -}}
{{- default "redis" .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "redis.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "redis.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}