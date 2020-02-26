# process-ui

# 기억할 것.
이 모듈을 사용하는 app 에서는 package.json에 다음을 적용해주어야 한다.
(bpmn-js의 https://github.com/bpmn-io/min-dom/issues/5 이 이슈때문에 shadow-dom에서 문제가 발생함)
```
"resolutions": {
  "matches-selector": "^1.2.0"
}
```
