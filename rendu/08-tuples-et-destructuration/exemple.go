package main

// Déstructuration positionnelle traduite par accès indexés directs
func CalculateTuples(inputs [][]float64) []float64 {
	results := make([]float64, len(inputs))
	for i, tuple := range inputs {
		one := tuple[0]
		two := tuple[1]
		divisor := tuple[2]
		results[i] = (one + two) / divisor
	}
	return results
}
