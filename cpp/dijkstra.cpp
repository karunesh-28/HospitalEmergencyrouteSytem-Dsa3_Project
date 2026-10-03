#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <queue>
#include <tuple>
#include <algorithm>
#include <utility>
#include "json.hpp"   // nlohmann/json single-header

using json = nlohmann::json;
using PII  = std::pair<double, int>;
using namespace std;

int main() {
    json input;
    if (!(cin >> input)) {
        cerr << "Failed to read JSON input from stdin" << endl;
        return 1;
    }

    // Build adjacency list
    // Node id (string) → index
    map<string,int> idx;
    int N = 0;
    for (auto& n : input["nodes"]) {
        string node_id = n["id"].get<string>();
        if (idx.find(node_id) == idx.end()) {
            idx[node_id] = N++;
        }
    }

    vector<vector<tuple<int,double>>> adj(N); // {neighbor, eta_min}
    int closed_skipped = 0;

    for (auto& e : input["edges"]) {
        if (e["is_closed"].get<bool>()) { closed_skipped++; continue; }
        
        string from_id = e["from"].get<string>();
        string to_id = e["to"].get<string>();
        
        if (idx.find(from_id) == idx.end() || idx.find(to_id) == idx.end()) {
            continue;
        }
        
        int u = idx[from_id];
        int v = idx[to_id];
        double dist  = e["distance_km"].get<double>();
        double speed = e["speed_kmh"].get<double>();
        double cong  = e.value("congestion", 0.0);
        double eff   = speed * (1.0 - cong);
        if (eff < 1.0) eff = 1.0;
        double eta   = (dist / eff) * 60.0;
        adj[u].emplace_back(v, eta);
        adj[v].emplace_back(u, eta); // bidirectional
    }

    string src_id = input["source"].get<string>();
    string tgt_id = input["target"].get<string>();

    if (idx.find(src_id) == idx.end() || idx.find(tgt_id) == idx.end()) {
        json out;
        out["path"]           = vector<string>();
        out["eta_min"]        = -1;
        out["closed_skipped"] = closed_skipped;
        cout << out.dump() << "\n";
        return 0;
    }

    // Dijkstra
    int src = idx[src_id];
    int tgt = idx[tgt_id];
    vector<double> dist(N, 1e18);
    vector<int>    prev(N, -1);
    priority_queue<PII, vector<PII>, greater<PII>> pq;
    dist[src] = 0;
    pq.push({0.0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto& [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                prev[v] = u;
                pq.push({dist[v], v});
            }
        }
    }

    // Reconstruct path
    vector<string> path;
    if (dist[tgt] < 1e17) {
        map<int,string> rev;
        for (auto& [k,v] : idx) rev[v] = k;
        for (int cur = tgt; cur != -1; cur = prev[cur])
            path.push_back(rev[cur]);
        reverse(path.begin(), path.end());
    }

    json out;
    out["path"]           = path;
    out["eta_min"]        = (dist[tgt] >= 1e17) ? -1 : dist[tgt];
    out["closed_skipped"] = closed_skipped;
    cout << out.dump() << "\n";
    return 0;
}
