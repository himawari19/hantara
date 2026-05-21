export type CodeLanguage =
  | "curl"
  | "javascript-fetch"
  | "javascript-axios"
  | "python-requests"
  | "go"
  | "php"
  | "ruby"
  | "java"
  | "csharp";

interface RequestConfig {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  bodyType?: string;
}

export function generateCode(config: RequestConfig, language: CodeLanguage): string {
  switch (language) {
    case "curl":
      return generateCurl(config);
    case "javascript-fetch":
      return generateJsFetch(config);
    case "javascript-axios":
      return generateJsAxios(config);
    case "python-requests":
      return generatePython(config);
    case "go":
      return generateGo(config);
    case "php":
      return generatePhp(config);
    case "ruby":
      return generateRuby(config);
    case "java":
      return generateJava(config);
    case "csharp":
      return generateCSharp(config);
    default:
      return "";
  }
}

function generateCurl(config: RequestConfig): string {
  const parts: string[] = [`curl -X ${config.method}`];

  parts.push(`  '${config.url}'`);

  Object.entries(config.headers).forEach(([key, value]) => {
    parts.push(`  -H '${key}: ${value}'`);
  });

  if (config.body && config.method !== "GET") {
    parts.push(`  -d '${config.body.replace(/'/g, "\\'")}'`);
  }

  return parts.join(" \\\n");
}

function generateJsFetch(config: RequestConfig): string {
  const options: string[] = [];
  options.push(`  method: '${config.method}'`);

  if (Object.keys(config.headers).length > 0) {
    const headerLines = Object.entries(config.headers)
      .map(([k, v]) => `    '${k}': '${v}'`)
      .join(",\n");
    options.push(`  headers: {\n${headerLines}\n  }`);
  }

  if (config.body && config.method !== "GET") {
    if (config.bodyType === "json") {
      options.push(`  body: JSON.stringify(${config.body})`);
    } else {
      options.push(`  body: '${config.body.replace(/'/g, "\\'")}'`);
    }
  }

  return `fetch('${config.url}', {\n${options.join(",\n")}\n})\n  .then(response => response.json())\n  .then(data => console.log(data))\n  .catch(error => console.error('Error:', error));`;
}

function generateJsAxios(config: RequestConfig): string {
  const lines: string[] = ["const axios = require('axios');", ""];

  const opts: string[] = [];
  opts.push(`  method: '${config.method.toLowerCase()}'`);
  opts.push(`  url: '${config.url}'`);

  if (Object.keys(config.headers).length > 0) {
    const headerLines = Object.entries(config.headers)
      .map(([k, v]) => `    '${k}': '${v}'`)
      .join(",\n");
    opts.push(`  headers: {\n${headerLines}\n  }`);
  }

  if (config.body && config.method !== "GET") {
    if (config.bodyType === "json") {
      opts.push(`  data: ${config.body}`);
    } else {
      opts.push(`  data: '${config.body.replace(/'/g, "\\'")}'`);
    }
  }

  lines.push(`axios({\n${opts.join(",\n")}\n})`);
  lines.push("  .then(response => console.log(response.data))");
  lines.push("  .catch(error => console.error(error));");

  return lines.join("\n");
}

function generatePython(config: RequestConfig): string {
  const lines: string[] = ["import requests", ""];

  lines.push(`url = "${config.url}"`);

  if (Object.keys(config.headers).length > 0) {
    const headerLines = Object.entries(config.headers)
      .map(([k, v]) => `    "${k}": "${v}"`)
      .join(",\n");
    lines.push(`headers = {\n${headerLines}\n}`);
  }

  if (config.body && config.method !== "GET") {
    if (config.bodyType === "json") {
      lines.push(`payload = ${config.body}`);
    } else {
      lines.push(`payload = "${config.body.replace(/"/g, '\\"')}"`);
    }
  }

  const args: string[] = ["url"];
  if (Object.keys(config.headers).length > 0) args.push("headers=headers");
  if (config.body && config.method !== "GET") {
    args.push(config.bodyType === "json" ? "json=payload" : "data=payload");
  }

  lines.push("");
  lines.push(`response = requests.${config.method.toLowerCase()}(${args.join(", ")})`);
  lines.push("print(response.status_code)");
  lines.push("print(response.json())");

  return lines.join("\n");
}

function generateGo(config: RequestConfig): string {
  const lines: string[] = [
    "package main",
    "",
    "import (",
    '    "fmt"',
    '    "io/ioutil"',
    '    "net/http"',
  ];

  if (config.body && config.method !== "GET") {
    lines.push('    "strings"');
  }

  lines.push(")", "");
  lines.push("func main() {");

  if (config.body && config.method !== "GET") {
    lines.push(`    body := strings.NewReader(\`${config.body}\`)`);
    lines.push(`    req, err := http.NewRequest("${config.method}", "${config.url}", body)`);
  } else {
    lines.push(`    req, err := http.NewRequest("${config.method}", "${config.url}", nil)`);
  }

  lines.push("    if err != nil {");
  lines.push("        panic(err)");
  lines.push("    }");

  Object.entries(config.headers).forEach(([k, v]) => {
    lines.push(`    req.Header.Set("${k}", "${v}")`);
  });

  lines.push("");
  lines.push("    client := &http.Client{}");
  lines.push("    resp, err := client.Do(req)");
  lines.push("    if err != nil {");
  lines.push("        panic(err)");
  lines.push("    }");
  lines.push("    defer resp.Body.Close()");
  lines.push("");
  lines.push("    respBody, _ := ioutil.ReadAll(resp.Body)");
  lines.push('    fmt.Println(string(respBody))');
  lines.push("}");

  return lines.join("\n");
}

function generatePhp(config: RequestConfig): string {
  const lines: string[] = ["<?php", "", "$curl = curl_init();", ""];
  lines.push("curl_setopt_array($curl, [");
  lines.push(`    CURLOPT_URL => "${config.url}",`);
  lines.push("    CURLOPT_RETURNTRANSFER => true,");
  lines.push(`    CURLOPT_CUSTOMREQUEST => "${config.method}",`);

  if (Object.keys(config.headers).length > 0) {
    const headerArr = Object.entries(config.headers)
      .map(([k, v]) => `        "${k}: ${v}"`)
      .join(",\n");
    lines.push(`    CURLOPT_HTTPHEADER => [\n${headerArr}\n    ],`);
  }

  if (config.body && config.method !== "GET") {
    lines.push(`    CURLOPT_POSTFIELDS => '${config.body.replace(/'/g, "\\'")}',`);
  }

  lines.push("]);", "");
  lines.push("$response = curl_exec($curl);");
  lines.push("curl_close($curl);");
  lines.push("echo $response;");

  return lines.join("\n");
}

function generateRuby(config: RequestConfig): string {
  const lines: string[] = [
    "require 'net/http'",
    "require 'uri'",
    "require 'json'",
    "",
    `uri = URI.parse("${config.url}")`,
    `request = Net::HTTP::${capitalize(config.method)}.new(uri)`,
  ];

  Object.entries(config.headers).forEach(([k, v]) => {
    lines.push(`request["${k}"] = "${v}"`);
  });

  if (config.body && config.method !== "GET") {
    lines.push(`request.body = '${config.body.replace(/'/g, "\\'")}'`);
  }

  lines.push("");
  lines.push("response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == 'https') do |http|");
  lines.push("  http.request(request)");
  lines.push("end");
  lines.push("");
  lines.push("puts response.code");
  lines.push("puts response.body");

  return lines.join("\n");
}

function generateJava(config: RequestConfig): string {
  const lines: string[] = [
    "import java.net.http.*;",
    "import java.net.URI;",
    "",
    "public class Main {",
    "    public static void main(String[] args) throws Exception {",
    "        HttpClient client = HttpClient.newHttpClient();",
  ];

  if (config.body && config.method !== "GET") {
    lines.push(`        String body = "${config.body.replace(/"/g, '\\"')}";`);
    lines.push("        HttpRequest request = HttpRequest.newBuilder()");
    lines.push(`            .uri(URI.create("${config.url}"))`);
    lines.push(`            .method("${config.method}", HttpRequest.BodyPublishers.ofString(body))`);
  } else {
    lines.push("        HttpRequest request = HttpRequest.newBuilder()");
    lines.push(`            .uri(URI.create("${config.url}"))`);
    lines.push(`            .method("${config.method}", HttpRequest.BodyPublishers.noBody())`);
  }

  Object.entries(config.headers).forEach(([k, v]) => {
    lines.push(`            .header("${k}", "${v}")`);
  });

  lines.push("            .build();");
  lines.push("");
  lines.push("        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());");
  lines.push("        System.out.println(response.statusCode());");
  lines.push("        System.out.println(response.body());");
  lines.push("    }");
  lines.push("}");

  return lines.join("\n");
}

function generateCSharp(config: RequestConfig): string {
  const lines: string[] = [
    "using System.Net.Http;",
    "",
    "var client = new HttpClient();",
  ];

  if (config.body && config.method !== "GET") {
    lines.push(`var content = new StringContent("${config.body.replace(/"/g, '\\"')}", System.Text.Encoding.UTF8, "application/json");`);
    lines.push(`var request = new HttpRequestMessage(HttpMethod.${capitalize(config.method)}, "${config.url}");`);
    lines.push("request.Content = content;");
  } else {
    lines.push(`var request = new HttpRequestMessage(HttpMethod.${capitalize(config.method)}, "${config.url}");`);
  }

  Object.entries(config.headers).forEach(([k, v]) => {
    lines.push(`request.Headers.Add("${k}", "${v}");`);
  });

  lines.push("");
  lines.push("var response = await client.SendAsync(request);");
  lines.push("var body = await response.Content.ReadAsStringAsync();");
  lines.push("Console.WriteLine(response.StatusCode);");
  lines.push("Console.WriteLine(body);");

  return lines.join("\n");
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export const languageLabels: Record<CodeLanguage, string> = {
  curl: "cURL",
  "javascript-fetch": "JavaScript (Fetch)",
  "javascript-axios": "JavaScript (Axios)",
  "python-requests": "Python (Requests)",
  go: "Go",
  php: "PHP (cURL)",
  ruby: "Ruby",
  java: "Java (HttpClient)",
  csharp: "C# (HttpClient)",
};
