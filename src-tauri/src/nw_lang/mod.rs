pub mod commands;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NwPipeline {
    pub command: String,
    pub args: Vec<String>,
    pub pipes: Vec<PipeStage>,
    pub redirect: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipeStage {
    pub name: String,
    pub args: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NwResult {
    pub handled: bool,
    pub output: String,
    pub error: Option<String>,
}

pub fn parse(input: &str) -> Option<NwPipeline> {
    let trimmed = input.trim();
    if !trimmed.starts_with("nw ") && trimmed != "nw" {
        return None;
    }

    let without_prefix = if trimmed == "nw" { "" } else { &trimmed[3..] };
    let tokens = tokenize(without_prefix);

    if tokens.is_empty() {
        return Some(NwPipeline {
            command: "help".to_string(),
            args: vec![],
            pipes: vec![],
            redirect: None,
        });
    }

    let mut segments: Vec<Vec<String>> = vec![vec![]];
    let mut redirect: Option<String> = None;

    let mut i = 0;
    while i < tokens.len() {
        if tokens[i] == "|" {
            segments.push(vec![]);
        } else if tokens[i] == ">" {
            if i + 1 < tokens.len() {
                redirect = Some(tokens[i + 1].clone());
                break;
            }
        } else {
            segments.last_mut().unwrap().push(tokens[i].clone());
        }
        i += 1;
    }

    let first = &segments[0];
    if first.is_empty() {
        return Some(NwPipeline {
            command: "help".to_string(),
            args: vec![],
            pipes: vec![],
            redirect,
        });
    }

    let command = first[0].to_lowercase();
    let args = first[1..].to_vec();

    let pipes: Vec<PipeStage> = segments[1..]
        .iter()
        .filter(|s| !s.is_empty())
        .map(|s| PipeStage {
            name: s[0].to_lowercase(),
            args: s[1..].to_vec(),
        })
        .collect();

    Some(NwPipeline {
        command,
        args,
        pipes,
        redirect,
    })
}

fn tokenize(input: &str) -> Vec<String> {
    let mut tokens = Vec::new();
    let mut current = String::new();
    let mut in_quote = false;
    let mut quote_char = '"';

    for ch in input.chars() {
        if in_quote {
            if ch == quote_char {
                in_quote = false;
            } else {
                current.push(ch);
            }
        } else if ch == '"' || ch == '\'' {
            in_quote = true;
            quote_char = ch;
        } else if ch == '|' || ch == '>' {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
            tokens.push(ch.to_string());
        } else if ch.is_whitespace() {
            if !current.is_empty() {
                tokens.push(current.clone());
                current.clear();
            }
        } else {
            current.push(ch);
        }
    }
    if !current.is_empty() {
        tokens.push(current);
    }
    tokens
}

pub async fn execute(input: &str) -> NwResult {
    match parse(input) {
        Some(pipeline) => commands::dispatch(pipeline).await,
        None => NwResult {
            handled: false,
            output: String::new(),
            error: None,
        },
    }
}
