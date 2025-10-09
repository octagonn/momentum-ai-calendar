import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { GOAL_COLORS, getColorName, type GoalColor } from '../../lib/colorUtils';

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  colors?: string[];
}

export default function ColorPicker({ 
  selectedColor, 
  onColorSelect, 
  colors = GOAL_COLORS 
}: ColorPickerProps) {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: themeColors.text }]}>
        Choose a color
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colorList}
      >
        {colors.map((color) => {
          const isSelected = selectedColor === color;
          
          return (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                {
                  backgroundColor: color,
                  borderColor: isSelected ? themeColors.text : 'transparent',
                  borderWidth: isSelected ? 3 : 1,
                }
              ]}
              onPress={() => onColorSelect(color)}
              activeOpacity={0.7}
            >
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      <Text style={[styles.colorName, { color: themeColors.textSecondary }]}>
        {getColorName(selectedColor)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  colorList: {
    paddingVertical: 8,
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  colorName: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
