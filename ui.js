// ui.js：操作面板与视图（原生 DOM，无弹窗）
import { render } from "./app.js";

export function mount(spec, parts) {
  parts.log.textContent = "事件 " + (spec.events || []).length + " 条，本轮窃取预算 " + (spec.budget || 0) + " 次。";

  function draw() {
    let view = null;
    try {
      view = render(spec);
    } catch (error) {
      parts.out.textContent = String(error && error.code ? error.code : error);
      parts.log.textContent = "跑不动：" + String(error && error.message ? error.message : error);
      return;
    }
    parts.out.textContent = JSON.stringify(view, null, 1);
    parts.stage.textContent = "";
    (view.queues || []).forEach(function (row) {
      const line = document.createElement("div");
      line.className = "row";
      const head = document.createElement("span");
      head.textContent = "工人 " + row[0] + " 的队列 " + JSON.stringify(row[1]);
      line.appendChild(head);
      const chip = document.createElement("span");
      chip.className = "chip" + (row[1].length ? " ok" : " warn");
      chip.textContent = row[1].length ? "还有活" : "空了";
      line.appendChild(chip);
      parts.stage.appendChild(line);
    });
    (view.stolen || []).forEach(function (job) {
      const line = document.createElement("div");
      line.className = "row";
      const head = document.createElement("span");
      head.textContent = "被窃走的活 " + job;
      line.appendChild(head);
      const chip = document.createElement("span");
      chip.className = "chip ok";
      chip.textContent = "已转手";
      line.appendChild(chip);
      parts.stage.appendChild(line);
    });
    (view.ledger || []).forEach(function (row) {
      const line = document.createElement("div");
      line.className = "row";
      const head = document.createElement("span");
      head.textContent = "窃取请求 " + row[0] + " 到 " + row[1] + " 压在账上";
      line.appendChild(head);
      const chip = document.createElement("span");
      chip.className = "chip warn";
      chip.textContent = "等收尾";
      line.appendChild(chip);
      parts.stage.appendChild(line);
    });
    parts.legend.textContent = "首轮窃取 " + view.steal_first + " 次，二档 "
      + view.steal_wide + " 次，收尾前账 " + view.ledger_before + " 次，收尾补齐 "
      + view.catchup + " 次，收尾后账 " + view.ledger_after + " 次";
    parts.log.textContent = "工作计数 " + view.judged + " / 上界 " + view.judged_bound
      + "，重放新窃取 " + view.replay_new + "，与全量对照差异 " + view.full_diff;
  }

  const budgetInput = document.createElement("input");
  budgetInput.type = "number";
  budgetInput.value = "1";
  parts.controls.appendChild(budgetInput);

  const runButton = document.createElement("button");
  runButton.className = "primary";
  runButton.textContent = "跑一遍";
  runButton.addEventListener("click", draw);
  parts.controls.appendChild(runButton);

  const budgetButton = document.createElement("button");
  budgetButton.textContent = "把窃取预算换成输入框的值";
  budgetButton.addEventListener("click", function () {
    const next = Number(budgetInput.value);
    spec.budget = Number.isFinite(next) ? Math.max(1, Math.round(next)) : 1;
    draw();
  });
  parts.controls.appendChild(budgetButton);

  const dropButton = document.createElement("button");
  dropButton.textContent = "删最后一条事件";
  dropButton.addEventListener("click", function () {
    spec.events = (spec.events || []).slice(0, Math.max(0, (spec.events || []).length - 1));
    draw();
  });
  parts.controls.appendChild(dropButton);

  draw();
}
